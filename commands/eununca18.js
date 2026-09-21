const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { listaJogos } = require('../lib/gamesList');
const { iniciarJogo, jogoEmAndamento } = require('../lib/gameRuntime');

module.exports = {
  name: 'eununca18',
  aliases: ['en18', 'em18', 'nm18', 'en+18', 'em+18', 'nm+18'],
  adminOnly: true,
  async execute({ sock, groupId, reply }) {
    const jogoBase = listaJogos[1]; // índice 1 = Eu Nunca +18
    
    const config = getGroupConfig(groupId);
    if (jogoEmAndamento(groupId) || config.jogos.estado !== 'idle') {
      return reply('Já tem um jogo em andamento nesse grupo. Use #pararjogo antes de iniciar outro.');
    }

    const figurinhas = config.jogos.figurinhas[jogoBase.id] || [];
    if (figurinhas.length === 0) {
      return reply(
        `O jogo "${jogoBase.nome}" ainda não tem figurinhas configuradas.\n` +
        `Use "#jogos addfigurinha 2" e depois manda a figurinha antes de iniciar.`
      );
    }

    const perguntasCustom = config.jogos.perguntasCustom[jogoBase.id] || [];
    const jogo = {
      ...jogoBase,
      perguntas: perguntasCustom.length > 0 ? perguntasCustom : jogoBase.perguntas
    };

    setGroupConfig(groupId, 'jogos.jogoAtual', jogoBase.id);
    await iniciarJogo(sock, groupId, jogo, figurinhas);
  }
};
