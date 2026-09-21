const { getDaily, getSaldo } = require('../lib/economy');

module.exports = {
  name: 'daily',
  aliases: ['diario'],
  adminOnly: false,

  async execute({ groupId, senderId, reply }) {
    const resultado = getDaily(groupId, senderId);
    return reply(resultado.mensagem);
  }
};
