const { getPatente, getTopUsuarios } = require('../lib/xp');
const { db } = require('../lib/database');

module.exports = {
  name: 'cargo',
  aliases: ['cargos', 'patente', 'patentes'],
  adminOnly: false,

  async execute({ groupId, senderId, reply, args }) {
    const mencionados = args[0]?.replace('@', '').replace(/[^0-9]/g, '');
    
    let userId;
    let userName;
    
    if (mencionados) {
      userId = mencionados.includes('@') ? mencionados : `${mencionados}@s.whatsapp.net`;
    } else {
      userId = senderId;
    }
    
    try {
      const user = db.get(['users', groupId, userId]).value() || {};
      const nivel = user.nivel || 1;
      const patente = getPatente(nivel);
      
      // Patentes disponíveis com níveis
      const patentes = [
        { nivel: 1, nome: '🆕 Novato', emoji: '🆕' },
        { nivel: 4, nome: '🟢 Ativo', emoji: '🟢' },
        { nivel: 7, nome: '🔵 Membro Fiel', emoji: '🔵' },
        { nivel: 11, nome: '🟡 Veterano', emoji: '🟡' },
        { nivel: 16, nome: '🟠 Elite', emoji: '🟠' },
        { nivel: 21, nome: '🔴 Mestre', emoji: '🔴' },
        { nivel: 31, nome: '👑 Lenda', emoji: '👑' },
        { nivel: 51, nome: '💎 Diamond', emoji: '💎' }
      ];
      
      // Encontrar próxima patente
      let proximaPatente = patentes.find(p => p.nivel > nivel);
      let faltaProxima = proximaPatente ? proximaPatente.nivel - nivel : 0;
      
      let msg = `🎖️ *Sistema de Patentes*\n\n`;
      msg += `👤 Usuário: @${userId.split('@')[0]}\n`;
      msg += `📊 Nível: *${nivel}*\n`;
      msg += `🎖️ Patente atual: *${patente}*\n\n`;
      
      if (proximaPatente) {
        msg += `⏳ Próxima patente: *${proximaPatente.nome}*\n`;
        msg += `   Falta(m) *${faltaProxima} nível(is)*\n\n`;
      }
      
      msg += `📋 *Todas as Patentes:*\n`;
      for (const p of patentes) {
        const marcador = nivel >= p.nivel ? '✅' : '⬜';
        msg += `${marcador} Nv ${p.nivel}: ${p.nome}\n`;
      }
      
      return await reply(msg);
    } catch (err) {
      console.error('[cargo] Erro:', err.message);
      return reply('⚠️ Erro ao buscar informações.');
    }
  }
};
