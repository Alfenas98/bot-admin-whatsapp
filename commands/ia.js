const { chatWithMemory } = require('../lib/ai');

module.exports = {
  name: 'ia',
  aliases: ['bot', 'ai'],
  adminOnly: false,

  async execute({ groupId, msg, reply, args, senderId }) {
    const message = args.join(' ');
    
    if (!message) {
      return reply('🤖 *IA*\n\nUse: #ia <mensagem>\n\nOu envie uma mensagem com "bot".');
    }

    try {
      await reply('🤔 Pensando...');
      
      const userName = msg.pushName || 'Usuário';
      const resposta = await chatWithMemory(senderId, userName, message);
      
      if (resposta) {
        await reply(`🤖 ${resposta}`);
      } else {
        await reply('⚠️ A IA não conseguiu responder. Tente novamente.');
      }
    } catch (err) {
      console.error('[ia] Erro:', err.message);
      await reply('⚠️ Erro ao processar. Tente novamente.');
    }
  }
};
