const { registrarAuditoria } = require('../lib/auditLog');

module.exports = {
  name: 'rebaixar',
  adminOnly: true,
  async execute({ sock, groupId, msg, senderId, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #rebaixar');
    try {
      await sock.groupParticipantsUpdate(groupId, mencionados, 'demote');
      await registrarAuditoria(sock, groupId, `@${senderId.split('@')[0]} rebaixou: ${mencionados.map(m => '@' + m.split('@')[0]).join(', ')}`);
      return reply(`✅ ${mencionados.length} usuário(s) rebaixado(s).`);
    } catch (err) {
      return reply('⚠️ Não consegui rebaixar. Confirme que o bot é admin do grupo.');
    }
  }
};
