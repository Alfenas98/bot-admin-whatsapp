const { isGroupAdminCached, getAdminIdsCached } = require('../lib/groupCache');

module.exports = {
  name: 'citar',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participants = metadata.participants || [];
      const mentions = participants.map(p => p.id);

      if (mentions.length === 0) {
        return reply('⚠️ Nenhum participante encontrado.');
      }

      await sock.sendMessage(groupId, {
        text: '📢 Marcando todos os membros do grupo...',
        mentions
      });
    } catch (err) {
      console.error('[citar] Falha ao marcar todos:', err.message);
      await reply('⚠️ Erro ao marcar membros.');
    }
  }
};