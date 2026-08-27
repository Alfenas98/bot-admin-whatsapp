module.exports = {
  name: 'id',
  adminOnly: false,
  async execute({ sock, groupId, senderId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const sender = metadata.participants.find(p => p.id === senderId);
      const nome = sender?.displayName || sender?.name || senderId.split('@')[0];

      await reply(
        `🆔 *ID do usuário*\n\n` +
        `👤 Nome: ${nome}\n` +
        `🔢 ID: ${senderId}\n` +
        `💬 Grupo: ${metadata.subject}\n` +
        `🆔 Group ID: ${groupId}`
      );
    } catch (err) {
      console.error('[id] Falha:', err.message);
      await reply('⚠️ Erro ao buscar ID.');
    }
  }
};