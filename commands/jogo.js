const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { listaJogos } = require('../lib/gamesList');
const { iniciarJogo, jogoEmAndamento } = require('../lib/gameRuntime');

module.exports = {
  name: 'jogo',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    let numero = args[0];
    
    // Aliases para jogos específicos (variações com e sem +)
    const aliases = {
      'en+18': 2,
      'em+18': 2,
      'en18': 2,
      'em18': 2,
      'eununca18': 2,
      'eu-nunca-18': 2,
      'eu_nunca_18': 2,
      'en-18': 2,
      'em-18': 2,
      'verdade': 3,
      'verdade-ou-desafio': 3,
      'vod': 3,
      'verdade18': 4,
      'verdadeou-desafio18': 4,
      'verdade-ou-desafio-18': 4,
      'vod18': 4,
      'verdade-ou-desafio+18': 4,
      'qualfoi': 5,
      'qual-foi': 5,
      'enquete': 6,
      'enquete-polemica': 6,
      'enquete-polemica': 6,
    };
    
    // Se for um alias, converter para número
    if (numero && aliases[numero.toLowerCase()]) {
      numero = aliases[numero.toLowerCase()];
    } else {
      numero = parseInt(numero, 10);
    }
    
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

    const perguntasCustom = config.jogos.perguntasCustom[jogoBase.id] || [];
    const jogo = {
      ...jogoBase,
      perguntas: perguntasCustom.length > 0 ? perguntasCustom : jogoBase.perguntas
    };

    setGroupConfig(groupId, 'jogos.jogoAtual', jogoBase.id);
    await iniciarJogo(sock, groupId, jogo, figurinhas);
  }
};
