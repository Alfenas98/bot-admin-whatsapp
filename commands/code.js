const { queryLLM } = require('../lib/aiClient');

module.exports = {
  name: 'code',
  aliases: ['code', 'codigo', 'prog'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('ℹ️ Uso: #code <sua requisição de código>\nEx: #code função de hash em Python');
    }

    const prompt = args.join(' ');
    await reply('💻 Gerando código...');

    try {
      const systemPrompt = `Você é um programador experiente. Responda apenas com código funcional, sem explicações.\nRetorne código limpo e pronto para uso. Se a requisição não for sobre programação, responda educadamente que só ajuda com código.\n\nRequisito: ${prompt}`;
      
      const codigo = await queryLLM(systemPrompt);
      await reply(`\`\`\`\n${codigo}\n\`\`\``);
    } catch (err) {
      console.error('[code]', err.message);
      await reply('❌ Não consegui gerar o código. Tente reformular.');
    }
  }
};
