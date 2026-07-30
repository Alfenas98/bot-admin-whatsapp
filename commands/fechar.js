module.exports = {
  name: 'fechar',
  adminOnly: true,
  async execute({ sock, groupId, reply }) {
    try {
      await sock.groupSettingUpdate(groupId, 'announcement');
      return reply('🔒 Grupo fechado: só admins podem mandar mensagem (configuração nativa do WhatsApp).');
    } catch (err) {
      return reply('⚠️ Não consegui fechar o grupo. Confirme que o bot é admin.');
    }
  }
};
