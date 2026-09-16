const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'traduzir',
  aliases: ['traduzir', 'traducao', 'translate'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0 || args[0]?.includes('|') === false) {
      return reply('ℹ️ Uso: #traduzir pt|en "texto"\nEx: #traduzir en|pt "Hello world"\nSuportado: pt, en, es, fr, de, it, ru, ja, zh, ar, e mais.');
    }

    // Parse idioma origem|destino
    const idiomaStr = args[0];
    const [origem, destino] = idiomaStr.split('|');
    const texto = args.slice(1).join(' ');

    if (!origem || !destino || !texto) {
      return reply('⚠️ Formato inválido. Use: #traduzir pt|en "texto"');
    }

    await reply('🌍 Traduzindo...');

    try {
      const prompt = `Traduza exclusivamente do ${origem === 'pt' ? 'português' : origem} para ${destino === 'en' ? 'inglês' : (destino === 'es' ? 'espanhol' : destino)}:\n\n"${texto}"`;
      const traducao = await queryLLM(prompt);
      await reply(`🗣️ ${traducao}`);
    } catch (err) {
      console.error('[traduzir]', err.message);
      await reply('❌ Não consegui traduzir agora. Tente reescrever.');
    }
  }
};
