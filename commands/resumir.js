const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'resumir',
  aliases: ['resumir', 'resumo', 'summarize'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply, textContent }) {
    if (args.length === 0 && !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      return reply('ℹ️ Uso: #resumir < responda uma mensagem > \nou: #resumir "texto longo aqui"');
    }

    let texto = '';

    if (args.length > 0 && args[0] !== 'responda') {
      texto = args.join(' ');
    } else {
      // Tenta resumir mensagem respondida
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted?.conversation) {
        texto = quoted.conversation;
      } else if (quoted?.extendedTextMessage?.text) {
        texto = quoted.extendedTextMessage.text;
      }
    }

    if (!texto || texto.length < 20) {
      return reply('⚠️ Mensagem muito curta ou não detectada para resumir.');
    }

    await reply('📝 Resumindo...');

    try {
      const prompt = `Resuma o texto a seguir em 3-5 frases curtas em português:\n\nTexto: "${texto}"`;
      const resumo = await queryLLM(prompt);
      await reply(`📋 *Resumo:* ${resumo}`);
    } catch (err) {
      console.error('[resumir]', err.message);
      await reply('❌ Não consegui resumir agora. Tente novamente.');
    }
  }
};
