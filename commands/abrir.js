module.exports = {
  name: 'abrir',
  adminOnly: true,
  async execute({ sock, groupId, reply }) {
    try {
      await sock.groupSettingUpdate(groupId, 'not_announcement');
      return reply('🔓 Grupo aberto: todos podem mandar mensagem novamente.');
    } catch (err) {
      return reply('⚠️ Não consegui abrir o grupo. Confirme que o bot é admin.');
    }
  }
};
