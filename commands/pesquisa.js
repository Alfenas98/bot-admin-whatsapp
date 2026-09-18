const { pesquisar } = require('../lib/ai');

module.exports = {
  name: 'pesquisa',
  aliases: ['buscar', 'search'],
  adminOnly: false,

  async execute({ reply, args }) {
    if (args.length === 0) {
      return reply('🔍 Use: #pesquisa <termo>\n\nExemplo: #pesquisa População de Taquaritinga SP');
    }

    const query = args.join(' ');
    
    try {
      await reply('🔍 Pesquisando na internet...');
      
      const resultado = await pesquisar(query);
      
      if (resultado) {
        return reply(`🔍 *Resultado da pesquisa:*\n\n${resultado}`);
      } else {
        return reply('⚠️ Não encontrei resultados. Tente outro termo.');
      }
    } catch (err) {
      console.error('[pesquisa] Erro:', err.message);
      return reply('⚠️ Erro ao pesquisar.');
    }
  }
};
