const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'ai',
  aliases: ['ia', 'bot'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso: #ai <sua pergunta>\nEx: #ai qual é a capital da noruega?');
    }

    const prompt = args.join(' ');
    await reply('🤔 Estou pensando...'); // Notifica que está processando

    try {
      const resposta = await queryLLM(prompt);
      await reply(resposta);
    } catch (err) {
      console.error('[ai]', err.message);
      await reply('❌ Ops! Não consegui responder. Tente novamente mais tarde.');
    }
  }
};
