/**
 * Verifica se um participante é admin do grupo.
 * groupMetadata vem de sock.groupMetadata(groupId)
 */
async function isGroupAdmin(sock, groupId, participantId) {
  const metadata = await sock.groupMetadata(groupId);
  const participant = metadata.participants.find(p => p.id === participantId);
  return participant ? ['admin', 'superadmin'].includes(participant.admin) : false;
}

/**
 * Verifica se o próprio bot é admin do grupo (necessário pra deletar msg/remover membro)
 */
async function isBotAdmin(sock, groupId) {
  const metadata = await sock.groupMetadata(groupId);
  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const bot = metadata.participants.find(p => p.id === botId);
  return bot ? ['admin', 'superadmin'].includes(bot.admin) : false;
}

module.exports = { isGroupAdmin, isBotAdmin };
