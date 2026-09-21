const { getPatente } = require('../lib/xp');
const { db } = require('../lib/database');

module.exports = {
  name: 'cargo',
  aliases: ['patente', 'patentes'],
  adminOnly: false,

  async execute({ sock, groupId, senderId, msg, reply, args }) {
    let userId;
    let isSelf = true;
    
    // Verificar se há menção na mensagem
    const mencionados = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (args[0]) {
      const arg = args[0].replace('@', '').replace(/[^0-9]/g, '');
      if (arg) {
        userId = arg.includes('@') ? arg : `${arg}@s.whatsapp.net`;
        isSelf = false;
      }
    }
    
    if (!userId && mencionados.length > 0) {
      userId = mencionados[0];
      isSelf = false;
    }
    
    if (!userId) {
      userId = senderId;
      isSelf = true;
    }
    
    try {
      const user = db.get(['users', groupId, userId]).value() || {};
      const nivel = user.nivel || 1;
      const patente = getPatente(nivel);
      
      // Buscar nome do usuário
      let nomeExibir = null;
      
      // 1. Se for o próprio usuário, usar pushName da mensagem
      if (isSelf && msg.pushName) {
        nomeExibir = msg.pushName;
      }
      
      // 2. Tentar buscar metadata do grupo
      if (!nomeExibir) {
        try {
          const metadata = await sock.groupMetadata(groupId);
          if (metadata?.participants) {
            let participante = metadata.participants.find(p => p.id === userId);
            if (!participante) {
              const userIdNum = userId.split('@')[0];
              participante = metadata.participants.find(p => p.id.startsWith(userIdNum));
            }
            if (participante) {
              nomeExibir = participante.pushName || participante.name || null;
            }
          }
        } catch (e) {
          console.error('[cargo] Erro ao buscar metadata:', e.message);
        }
      }
      
      // 3. Fallback: formatar o ID
      if (!nomeExibir) {
        const partes = userId.split('@');
        const numero = partes[0];
        const isTelefoneValido = /^\d{13}$/.test(numero) && numero.startsWith('55');
        
        if (isTelefoneValido) {
          const ddd = numero.substring(2, 4);
          const num = numero.substring(4);
          nomeExibir = `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`;
        } else if (numero.length > 12 || !numero.match(/^\d+$/)) {
          nomeExibir = 'Usuário';
        } else {
          nomeExibir = numero;
        }
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
      
      // Enviar com menção usando sock.sendMessage
      return await sock.sendMessage(groupId, {
        text: msgFinal,
        mentions: [userId]
      });
    } catch (err) {
      console.error('[cargo] Erro:', err.message);
      return reply('⚠️ Erro ao buscar informações.');
    }
  }
};
