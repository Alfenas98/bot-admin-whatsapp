module.exports = {
  name: 'tag',
  adminOnly: false,
  async execute({ sock, groupId, args, reply, textContent }) {
    if (args.length === 0) {
      return reply('⚠️ Use: #tag @pessoa ou #tag número');
    }

    const alvo = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      await sock.sendMessage(groupId, {
        text: `📢 Chamando ${alvo.split('@')[0]}`,
        mentions: [alvo]
      });
    } catch (err) {
      console.error('[tag] Falha ao marcar:', err.message);
      await reply('⚠️ Erro ao marcar essa pessoa.');
    }
  }
};