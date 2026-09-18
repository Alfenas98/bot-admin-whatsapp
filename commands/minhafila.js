const { getQueue } = require('../lib/rateLimiter');

module.exports = {
  name: 'minhafila',
  aliases: ['fila'],
  adminOnly: false,

  async execute({ senderId, reply }) {
    const fila = getQueue(senderId);
    
    if (fila.length === 0) {
      return reply('✅ Sua fila está vazia!');
    }
    
    let msg = '📋 *Sua fila de comandos:*\n\n';
    fila.forEach((cmd, i) => {
      const tempo = Math.round((Date.now() - cmd.queuedAt) / 1000);
      msg += `${i + 1}. *${cmd.commandName}* (${tempo}s)\n`;
    });
    
    return reply(msg);
  }
};
