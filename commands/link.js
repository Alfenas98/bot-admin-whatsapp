module.exports = {
  name: 'link',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const codigo = await sock.groupInviteCode(groupId);
      return reply(`🔗 Link atual do grupo:\nhttps://chat.whatsapp.com/${codigo}`);
    } catch (err) {
      return reply('⚠️ Não consegui gerar o link. Confirme que o bot é admin do grupo.');
    }
  }
};