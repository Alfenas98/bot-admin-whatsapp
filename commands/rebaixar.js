module.exports = {
  name: 'rebaixar',
  adminOnly: true,
  async execute({ sock, groupId, msg, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #rebaixar');
    try {
      await sock.groupParticipantsUpdate(groupId, mencionados, 'demote');
      return reply(`✅ ${mencionados.length} usuário(s) rebaixado(s).`);
    } catch (err) {
      return reply('⚠️ Não consegui rebaixar. Confirme que o bot é admin do grupo.');
    }
  }
};
