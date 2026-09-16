const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'sentimento',
  aliases: ['sentimento', 'sentiment'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply }) {
    let texto = '';

    if (args.length > 0) {
      texto = args.join(' ');
    } else {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted?.conversation) texto = quoted.conversation;
      else if (quoted?.extendedTextMessage?.text) texto = quoted.extendedTextMessage.text;
    }

    if (!texto) {
      return reply('ℹ️ Uso: #sentimento <texto> ou responda uma mensagem e digite #sentimento');
    }

    await reply('🔍 Analisando sentimento...');

    try {
      const prompt = `Classifique o sentimento do texto abaixo. Responda apenas: POSITIVO | NEGATIVO | NEUTRO\nTambém dê um breve motivo (max. 20 palavras).\n\nTexto: "${texto}"`;
      const resultado = await queryLLM(prompt);
      await reply(`🧠 *Análise:* ${resultado}`);
    } catch (err) {
      console.error('[sentimento]', err.message);
      await reply('❌ Não consegui analisar o sentimento.');
    }
  }
};
