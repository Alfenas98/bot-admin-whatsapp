const { getWarns } = require('../lib/warns');
module.exports = {
  name: 'warns',
  adminOnly: true,
  async execute({ groupId, msg, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #warns');
    const contagem = getWarns(groupId, mencionados[0]);
    return reply(`Advertências de @${mencionados[0].split('@')[0]}: ${contagem}`);
  }
};
