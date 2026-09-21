const { getPatente } = require('../lib/xp');
const { db } = require('../lib/database');

module.exports = {
  name: 'cargo',
  aliases: ['patente', 'patentes'],
  adminOnly: false,

  async execute({ sock, groupId, senderId, msg, reply, args }) {
    let userId;
    
    // Verificar se há menção na mensagem
    const mencionados = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (args[0]) {
      // Verificar se é uma menção por texto (@número)
      const arg = args[0].replace('@', '').replace(/[^0-9]/g, '');
      if (arg) {
        userId = arg.includes('@') ? arg : `${arg}@s.whatsapp.net`;
      }
    }
    
    if (!userId && mencionados.length > 0) {
      userId = mencionados[0];
    }
    
    if (!userId) {
      userId = senderId;
    }
    
    try {
      const user = db.get(['users', groupId, userId]).value() || {};
      const nivel = user.nivel || 1;
      const patente = getPatente(nivel);
      
      // Buscar nome do usuário
      let nomeExibir = null;
      
      // Tentar buscar metadata do grupo
      try {
        const metadata = await sock.groupMetadata(groupId);
        if (metadata?.participants) {
          const participante = metadata.participants.find(p => p.id === userId);
          if (participante) {
            nomeExibir = participante.pushName || participante.name || null;
          }
        }
      } catch (e) {}
      
      // Se não encontrou nome, usar pushName da mensagem
      if (!nomeExibir && userId === senderId) {
        nomeExibir = msg.pushName || null;
      }
      
      // Fallback: usar o número do ID
      if (!nomeExibir) {
        const parts = userId.split('@');
        const numero = parts[0];
        // Se for muito longo (lid), usar "Usuário"
        nomeExibir = numero.length > 15 ? 'Usuário' : `@${numero}`;
      }
      
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
      const proximaPatente = patentes.find(p => p.nivel > nivel);
      const faltaProxima = proximaPatente ? proximaPatente.nivel - nivel : 0;
      
      let msgFinal = `🎖️ *Sistema de Patentes*\n\n`;
      msgFinal += `👤 Usuário: ${nomeExibir}\n`;
      msgFinal += `📊 Nível: *${nivel}*\n`;
      msgFinal += `🎖️ Patente atual: *${patente}*\n\n`;
      
      if (proximaPatente) {
        msgFinal += `⏳ Próxima patente: *${proximaPatente.nome}*\n`;
        msgFinal += `   Falta(m) *${faltaProxima} nível(is)*\n\n`;
      }
      
      msgFinal += `📋 *Todas as Patentes:*\n`;
      for (const p of patentes) {
        const marcador = nivel >= p.nivel ? '✅' : '⬜';
        msgFinal += `${marcador} Nv ${p.nivel}: ${p.nome}\n`;
      }
      
      return await reply(msgFinal);
    } catch (err) {
      console.error('[cargo] Erro:', err.message);
      return reply('⚠️ Erro ao buscar informações.');
    }
  }
};
