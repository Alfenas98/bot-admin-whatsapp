module.exports = {
  name: 'apagar',
  aliases: ['del'],
  adminOnly: true,
  async execute({ sock, groupId, msg, reply }) {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const citada = contextInfo?.stanzaId;
    const participante = contextInfo?.participant;

    if (!citada || !participante) {
      return reply('Uso: responda (reply) a mensagem que deseja apagar junto com #apagar');
    }

    try {
      await sock.sendMessage(groupId, {
        delete: { remoteJid: groupId, fromMe: false, id: citada, participant: participante }
      });
    } catch (err) {
      return reply('⚠️ Não consegui apagar essa mensagem. Confirme que o bot é admin do grupo.');
    }
  }
};
