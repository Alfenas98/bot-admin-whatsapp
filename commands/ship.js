module.exports = {
  name: 'ship',
  adminOnly: false,
  async execute({ sock, groupId, senderId, reply }) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participantes = metadata.participants || [];

      if (participantes.length < 2) {
        return reply('⚠️ Grupo precisa de pelo menos 2 membros para shipar.');
      }

      const random1 = participantes[Math.floor(Math.random() * participantes.length)];
      let random2 = participantes[Math.floor(Math.random() * participantes.length)];
      while (random2.id === random1.id) {
        random2 = participantes[Math.floor(Math.random() * participantes.length)];
      }

      const nome1 = random1.displayName || random1.name || random1.id.split('@')[0];
      const nome2 = random2.displayName || random2.name || random2.id.split('@')[0];

      const compatibilidade = Math.floor(Math.random() * 100) + 1;

      let comentario;
      if (compatibilidade >= 90) comentario = '🔥 Casal perfeito!';
      else if (compatibilidade >= 70) comentario = '💕 Combinação muito forte!';
      else if (compatibilidade >= 50) comentario = '💖 Tem potencial!';
      else if (compatibilidade >= 30) comentario = '💔 Vai dar não...';
      else comentario = '🚫 Esquece, não vai dar certo.';

      const texto =
        `💘 *SHIP DO GRUPO*\n\n` +
        `👤 ${nome1}\n` +
        `❤️ X ❤️\n` +
        `👤 ${nome2}\n\n` +
        `📊 Compatibilidade: ${compatibilidade}%\n` +
        `${comentario}`;

      await sock.sendMessage(groupId, {
        text: texto,
        mentions: [random1.id, random2.id]
      });
    } catch (err) {
      console.error('[ship] Falha:', err.message);
      await reply('⚠️ Erro ao shipar.');
    }
  }
};