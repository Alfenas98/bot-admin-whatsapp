const { getGroupConfig } = require('../lib/database');
const { getGameState, setGameState } = require('../lib/runtimeStore');
const { embaralhar } = require('../gameRuntime');

module.exports = {
  name: 'pular',
  aliases: ['p', 'skip', 'next'],
  adminOnly: true,

  async execute({ sock, groupId, reply }) {
    // Verificar se há jogo em andamento
    const config = getGroupConfig(groupId);
    const estado = getGameState(groupId);
    
    if (!estado || !['aguardando', 'jogando'].includes(estado.etapa || estado.estado)) {
      return reply('⚠️ Nenhum jogo em andamento no momento.');
    }

    if (estado.tipo === 'enquete') {
      return reply('⚠️ O comando #p não funciona em enquetes. Aguente o tempo ou use #pararjogo.');
    }

    // Obter jogo atual
    const jogoId = estado.jogoId;
    let jogo = null;
    
    try {
      jogo = require(`../games/${jogoId}.js`);
    } catch (err) {
      return reply('⚠️ Não foi possível carregar o jogo atual.');
    }

    // Sortear próxima pergunta aleatória
    const perguntasRestantes = jogo.perguntas.filter((_, i) => i !== estado.perguntaIndex);
    
    if (perguntasRestantes.length === 0) {
      return reply('⚠️ Todas as perguntas já foram feitas! Use #pararjogo para encerrar.');
    }

    const perguntaAleatoria = perguntasRestantes[Math.floor(Math.random() * perguntasRestantes.length)];
    const novoIndex = jogo.perguntas.indexOf(perguntaAleatoria);
    
    // Atualizar estado
    estado.perguntaIndex = novoIndex;
    setGameState(groupId, estado);

    // Enviar pergunta
    await sock.sendMessage(groupId, {
      text: `🎲 *Pergunta Pulada!*\n\n*${perguntaAleatoria}*\n\n_Vocês têm 30 segundos pra responder!_`
    });

    // Configurar próxima pergunta após tempo
    const TEMPO_PERGUNTA_MS = 30000;
    
    // Limpar timeout anterior se existir
    const { runtimeState } = require('../gameRuntime');
    const runtime = runtimeState.get(groupId);
    if (runtime?.timeoutId) {
      clearTimeout(runtime.timeoutId);
    }

    // Novo timeout
    const timeoutId = setTimeout(async () => {
      await sock.sendMessage(groupId, { 
        text: '⏰ Tempo esgotado! Próxima pergunta a seguir...' 
      });
      
      // Próxima pergunta normal
      const { proximaPergunta } = require('../gameRuntime');
      const novoEstado = getGameState(groupId);
      if (novoEstado) {
        novoEstado.perguntaIndex += 1;
        setGameState(groupId, novoEstado);
        await proximaPergunta(sock, groupId, jogo);
      }
    }, TEMPO_PERGUNTA_MS);

    if (runtime) {
      runtime.timeoutId = timeoutId;
      runtimeState.set(groupId, runtime);
    }

    return reply(`✅ Pergunta pulada! Perguntas restantes: ${perguntasRestantes.length - 1}`);
  }
};
