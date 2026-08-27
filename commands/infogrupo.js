module.exports = {
  name: 'infogrupo',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const total = metadata.participants.length;
      const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

      await reply(
        `ℹ️ *Informações do Grupo*\n\n` +
        `📛 Nome: ${metadata.subject}\n` +
        `🆔 ID: ${metadata.id}\n` +
        `👥 Total: ${total} membros\n` +
        `👑 Admins: ${admins.length}\n` +
        `📅 Criado: ${new Date(metadata.creation * 1000).toLocaleDateString('pt-BR')}`
      );
    } catch (err) {
      console.error('[infogrupo] Falha:', err.message);
      await reply('⚠️ Erro ao buscar informações do grupo.');
    }
  }
};