const { apostar, getSaldo } = require('../lib/economy');

module.exports = {
  name: 'apostar',
  aliases: ['aposta', 'jogar'],
  adminOnly: false,

  async execute({ groupId, senderId, reply, args }) {
    const quantidade = parseInt(args[0], 10);
    
    if (!quantidade || quantidade <= 0) {
      return reply('⚠️ Uso: #apostar <quantia>\n\nEx: #apostar 50');
    }
    
    const resultado = apostar(groupId, senderId, quantidade);
    return reply(resultado.mensagem);
  }
};
