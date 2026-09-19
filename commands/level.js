const { getGroupConfig } = require('../lib/database');
const { getUser, xpParaProximoNivel, barraProgresso } = require('../lib/xp');
module.exports = {
  name: 'level',
  aliases: ['rank', 'xp'],
  adminOnly: false,
  async execute({ groupId, senderId, reply }) {
    const config = getGroupConfig(groupId);
    if (!config.levelSystem) return reply('⭐ O sistema de level está desativado neste grupo. Peça a um admin pra ativar com #levelsystem on');

    const user = getUser(groupId, senderId);
    const nivel = user.nivel || 1;
    const xpAtual = user.xp || 0;
    const xpNecessario = xpParaProximoNivel(nivel);
    const progresso = barraProgresso(xpAtual, xpNecessario);
    const porcentagem = Math.min(Math.round((xpAtual / xpNecessario) * 100), 100);
    
    return reply(
      `⭐ *Seu Progresso*\n\n` +
      `🏆 Nível: *${nivel}*\n` +
      `🎯 XP: *${xpAtual} / ${xpNecessario}* (${porcentagem}%)\n` +
      `${progresso}\n\n` +
      `📨 Mensagens: *${user.mensagens || 0}*\n\n` +
      `_Faltam ${xpNecessario - xpAtual} XP para o próximo nível!_`
    );
  }
};
