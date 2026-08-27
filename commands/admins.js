module.exports = {
  name: 'admins',
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

      if (admins.length === 0) {
        return reply('⚠️ Nenhum administrador encontrado.');
      }

      const lista = admins.map((a, i) => `${i + 1}. @${a.id.split('@')[0]}`).join('\n');
      await reply(`👑 *Administradores do grupo:*\n\n${lista}`);
    } catch (err) {
      console.error('[admins] Falha:', err.message);
      await reply('⚠️ Erro ao listar administradores.');
    }
  }
};