const { getGroupConfig } = require('../lib/database');
const { getUser, xpParaNivel } = require('../lib/xp');
module.exports = {
  name: 'level',
  aliases: ['rank', 'xp'],
  adminOnly: false,
  async execute({ groupId, senderId, reply }) {
    const config = getGroupConfig(groupId);
    if (!config.levelSystem) return reply('⭐ O sistema de level está desativado neste grupo. Peça a um admin pra ativar com #levelsystem on');

    const user = getUser(groupId, senderId);
    const proximoNivel = xpParaNivel(user.nivel);
    return reply(
      `⭐ *Seu progresso*\nNível: ${user.nivel}\nXP: ${user.xp}/${proximoNivel}\nMensagens enviadas: ${user.mensagens}`
    );
  }
};
