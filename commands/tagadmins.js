const { getAdminIdsCached } = require('../lib/groupCache');

module.exports = {
  name: 'tagadmins',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const adminIds = await getAdminIdsCached(sock, groupId);

      if (adminIds.length === 0) {
        return reply('⚠️ Nenhum admin encontrado.');
      }

      await sock.sendMessage(groupId, {
        text: '📢 Chamando os administradores...',
        mentions: adminIds
      });
    } catch (err) {
      console.error('[tagadmins] Falha ao marcar admins:', err.message);
      await reply('⚠️ Erro ao marcar administradores.');
    }
  }
};