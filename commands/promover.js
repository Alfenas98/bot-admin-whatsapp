const { registrarAuditoria } = require('../lib/auditLog');

module.exports = {
  name: 'promover',
  adminOnly: true,
  async execute({ sock, groupId, msg, senderId, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #promover');
    try {
      await sock.groupParticipantsUpdate(groupId, mencionados, 'promote');
      await registrarAuditoria(sock, groupId, `@${senderId.split('@')[0]} promoveu a admin: ${mencionados.map(m => '@' + m.split('@')[0]).join(', ')}`);
      return reply(`✅ ${mencionados.length} usuário(s) promovido(s) a admin.`);
    } catch (err) {
      return reply('⚠️ Não consegui promover. Confirme que o bot é admin do grupo.');
    }
  }
};
