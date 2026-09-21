const { getSaldo } = require('../lib/economy');

module.exports = {
  name: 'saldo',
  aliases: ['coins', 'money'],
  adminOnly: false,

  async execute({ groupId, senderId, reply }) {
    const saldo = getSaldo(groupId, senderId);
    
    const msg = `💰 *Seu Saldo*\n\n` +
                `💵 Coins: *${saldo.saldo}*\n` +
                `🔥 Streak: *${saldo.streak} dia(s)*\n` +
                `📈 Total ganho: *${saldo.totalGanho}*\n` +
                `📉 Total perdido: *${saldo.totalPerdido}*`;
    
    return reply(msg);
  }
};
