const { clearMemory } = require('../lib/ai');

module.exports = {
  name: 'limpaia',
  aliases: ['clearia', 'esquecer'],
  adminOnly: false,

  async execute({ senderId, reply }) {
    clearMemory(senderId);
    return reply('🧠 Memória da IA limpa! Vamos começar uma nova conversa.');
  }
};
