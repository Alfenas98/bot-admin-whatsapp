const { transferir, getSaldo } = require('../lib/economy');

module.exports = {
  name: 'transferir',
  aliases: ['pagar', 'enviar'],
  adminOnly: false,

  async execute({ sock, groupId, senderId, msg, reply, args }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mencionados.length === 0) {
      return reply('⚠️ Uso: #transferir <quantia> @pessoa\n\nEx: #transferir 50 @João');
    }
    
    const quantidade = parseInt(args[0], 10);
    
    if (!quantidade || quantidade <= 0) {
      return reply('⚠️ Quantidade inválida. Use: #transferir <quantia> @pessoa');
    }
    
    const paraUserId = mencionados[0];
    
    if (paraUserId === senderId) {
      return reply('❌ Você não pode transferir para si mesmo!');
    }
    
    const resultado = transferir(groupId, senderId, paraUserId, quantidade);
    
    if (!resultado.sucesso) {
      return reply(resultado.mensagem);
    }
    
    // Notificar ambos
    await reply(resultado.mensagem);
    
    try {
      await sock.sendMessage(groupId, {
        text: `💰 @${senderId.split('@')[0]} transferiu *${quantity}* coins para você!`,
        mentions: [paraUserId]
      });
    } catch (e) {}
  }
};
