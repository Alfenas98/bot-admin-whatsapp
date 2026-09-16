const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'topicos',
  aliases: ['topicos', 'topicos', 'tags'],
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
      return reply('ℹ️ Uso: #topicos <texto> ou responda a uma conversa e digite #topicos');
    }

    await reply('🏷️ Identificando tópicos...');

    try {
      const prompt = `Liste em forma de tags (#tema) os 3-5 assuntos principais no texto abaixo. Separe por vírgula.\n\nTexto: "${texto}"`;
      const topicosStr = await queryLLM(prompt);
      const tags = topicosStr.split(',').map(t => t.trim().replace(/#/g, '')).filter(Boolean);

      if (tags.length === 0) {
        return reply('⚠️ Não foi possível identificar tópicos.');
      }

      const mensagem = `🧵 *Tópicos identificados:*\n${tags.map(t => `#${t}`).join(', ')}`;
      await reply(mensagem);
    } catch (err) {
      console.error('[topicos]', err.message);
      await reply('❌ Não consegui identificar tópicos.');
    }
  }
};
