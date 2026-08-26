const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { listaJogos } = require('../lib/gamesList');
const { iniciarJogo, jogoEmAndamento } = require('../lib/gameRuntime');

module.exports = {
  name: 'jogo',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    const numero = parseInt(args[0], 10);
    const jogoBase = listaJogos[numero - 1];
    if (!jogoBase) return reply('Número de jogo inválido. Use #jogos pra ver a lista.');

    const config = getGroupConfig(groupId);
    if (jogoEmAndamento(groupId) || config.jogos.estado !== 'idle') {
      return reply('Já tem um jogo em andamento nesse grupo. Use #pararjogo antes de iniciar outro.');
    }

    const ehEnquete = jogoBase.tipo === 'enquete';
    let figurinhas = [];

    if (!ehEnquete) {
      figurinhas = config.jogos.figurinhas[jogoBase.id] || [];
      if (figurinhas.length === 0) {
        return reply(
          `O jogo "${jogoBase.nome}" ainda não tem figurinhas configuradas.\n` +
          `Use "#jogos addfigurinha ${numero}" e depois manda a figurinha antes de iniciar.`
        );
      }
    }

    // usa a lista de perguntas personalizada se existir, senão a padrão do jogo
    const perguntasCustom = config.jogos.perguntasCustom[jogoBase.id] || [];
    const jogo = {
      ...jogoBase,
      perguntas: perguntasCustom.length > 0 ? perguntasCustom : jogoBase.perguntas
    };

    setGroupConfig(groupId, 'jogos.jogoAtual', jogoBase.id);
    await iniciarJogo(sock, groupId, jogo, figurinhas);
  }
};
