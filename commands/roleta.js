const { apostar, getSaldo } = require('../lib/economy');

module.exports = {
  name: 'roleta',
  aliases: ['roletar', 'girar'],
  adminOnly: false,

  async execute({ groupId, senderId, reply, args }) {
    const quantidade = parseInt(args[0], 10);
    
    if (!quantidade || quantidade <= 0) {
      return reply('⚠️ Uso: #roleta <quantia>\n\nEx: #roleta 50');
    }
    
    const saldo = getSaldo(groupId, senderId);
    
    if (saldo.saldo < quantidade) {
      return reply(`❌ Saldo insuficiente! Você tem ${saldo.saldo} coins.`);
    }
    
    // Girar a roleta (1-6)
    const resultado = Math.floor(Math.random() * 6) + 1;
    
    // Se par, ganha o dobro. Se ímpar, perde.
    const ganhou = resultado % 2 === 0;
    
    let msg = `🎰 *Roleta Girou!*\n\n`;
    msg += `🎲 Resultado: *${resultado}*\n`;
    msg += `${ganhou ? '🎉 PAR! Você GANHOU!' : '💔 ÍMPAR! Você perdeu...'}\n\n`;
    
    if (ganhou) {
      const ganho = quantidade;
      // Adicionar o ganho (já que apostar já desconta, aqui só adiciona o ganho)
      const { addCoins } = require('../lib/economy');
      addCoins(groupId, senderId, ganho);
      msg += `💰 +${ganho} coins\n`;
    } else {
      // Já descontado pelo apostar
      msg += `💰 -${quantidade} coins\n`;
    }
    
    const novoSaldo = getSaldo(groupId, senderId);
    msg += `💵 Saldo: ${novoSaldo.saldo} coins`;
    
    return reply(msg);
  }
};
