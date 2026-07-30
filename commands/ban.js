module.exports = {
  name: 'ban',
  aliases: ['remover'],
  adminOnly: true,
  async execute({ sock, groupId, msg, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) {
      return reply('Uso: marque (@) o usuário que deseja remover junto com #ban');
    }
    try {
      await sock.groupParticipantsUpdate(groupId, mencionados, 'remove');
      return reply(`✅ ${mencionados.length} usuário(s) removido(s).`);
    } catch (err) {
      return reply('⚠️ Não consegui remover. Confirme que o bot é admin do grupo.');
    }
  }
};
