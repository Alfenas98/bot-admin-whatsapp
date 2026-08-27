module.exports = {
  name: 'membros',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const total = metadata.participants.length;
      await reply(`👥 Este grupo tem *${total} membros*.`);
    } catch (err) {
      console.error('[membros] Falha:', err.message);
      await reply('⚠️ Erro ao contar membros.');
    }
  }
};