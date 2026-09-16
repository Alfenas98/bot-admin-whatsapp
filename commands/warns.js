const { getWarns } = require('../lib/warns');

module.exports = {
  name: 'warns',
  adminOnly: true,
  async execute({ sock, groupId, msg, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #warns');
    
    const alvo = mencionados[0];
    const contagem = getWarns(groupId, alvo);
    
    await sock.sendMessage(groupId, {
      text: `Advertências de @${alvo.split('@')[0]}: ${contagem}`,
      mentions: [alvo]
    });
  }
};
