const { getGroupConfig } = require('../lib/database');
const { getUser, xpParaProximoNivel, barraProgresso, getPatente } = require('../lib/xp');
module.exports = {
  name: 'level',
  aliases: ['rank', 'xp'],
  adminOnly: false,
  async execute({ sock, groupId, senderId, msg, reply }) {
    const config = getGroupConfig(groupId);
    if (!config.levelSystem) return reply('⭐ O sistema de level está desativado neste grupo. Peça a um admin pra ativar com #levelsystem on');

    const user = getUser(groupId, senderId);
    const nivel = user.nivel || 1;
    const xpAtual = user.xp || 0;
    const xpNecessario = xpParaProximoNivel(nivel);
    const progresso = barraProgresso(xpAtual, xpNecessario);
    const porcentagem = Math.min(Math.round((xpAtual / xpNecessario) * 100), 100);
    const patente = getPatente(nivel);
    
    // Buscar nome do usuário
    let nomeExibir = msg.pushName || null;
    
    if (!nomeExibir) {
      try {
        const metadata = await sock.groupMetadata(groupId);
        if (metadata?.participants) {
          const participante = metadata.participants.find(p => p.id === senderId);
          if (participante) {
            nomeExibir = participante.pushName || participante.name || null;
          }
        }
      } catch (e) {}
    }
    
    if (!nomeExibir) {
      const partes = senderId.split('@');
      const numero = partes[0];
      nomeExibir = numero.length > 15 ? 'Usuário' : numero;
    }
    
    let msgFinal = '⭐ *Seu Progresso*\n\n';
    msgFinal += `👤 Usuário: ${nomeExibir}\n`;
    msgFinal += `🏆 Nível: *${nivel}*\n`;
    msgFinal += `🎖️ Patente: *${patente}*\n`;
    msgFinal += `🎯 XP: *${xpAtual} / ${xpNecessario}* (${porcentagem}%)\n`;
    msgFinal += `${progresso}\n\n`;
    msgFinal += `📨 Mensagens: *${user.mensagens || 0}*\n`;
    msgFinal += `🔥 Streak: *${user.streak || 0} mensagens*\n`;
    msgFinal += `📅 Dias consecutivos: *${user.diasConsecutivos || 0}*\n\n`;
    msgFinal += `_Faltam ${xpNecessario - xpAtual} XP para o próximo nível!_`;
    
    return await reply(msgFinal);
  }
};
