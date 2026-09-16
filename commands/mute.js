const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { parseDuracao, formatarDuracao, aplicarMuteTemporario, limparTimeout, desmutarAutomatico } = require('../lib/timeoutMute');

module.exports = {
  name: 'mutar',
  aliases: ['mute'],
  adminOnly: true,

  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso: #mutar @pessoa [tempo]\nTempo: 10m, 2h, 1d ou "perm" para mute permanente\nEx: #mutar @jose 10m  |  #mutar 5511999998888 30m  |  #mutar @jose perm');
    }

    // Verificar se há menção na mensagem
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let alvo = '';
    let nomeUsuario = '';

    if (mencionados.length > 0) {
      // Usar menção real (ID completo do WhatsApp)
      alvo = mencionados[0];
      // Tentar obter nome do participante
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.pushName) {
          nomeUsuario = participante.pushName;
        } else {
          nomeUsuario = alvo.split('@')[0];
        }
      } catch (err) {
        nomeUsuario = alvo.split('@')[0];
      }
    } else {
      // Fallback: extrair número do texto
      const numero = args[0].replace(/[^0-9]/g, '');
      
      if (!numero) {
        return reply('⚠️ Não foi possível identificar o usuário. Use: #mutar @pessoa ou #mutar 5511999998888');
      }
      
      alvo = numero + '@s.whatsapp.net';
      nomeUsuario = numero;
      
      // Tentar obter nome via groupMetadata
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.pushName) {
          nomeUsuario = participante.pushName;
        }
      } catch (err) {}
    }

    // Parse da duração (opcional)
    let duracaoMs = null;
    if (args.length >= 2) {
      const duracaoStr = args[1].toLowerCase();
      if (duracaoStr === 'perm') {
        duracaoMs = null; // permanente
      } else {
        try {
          duracaoMs = parseDuracao(duracaoStr);
        } catch (err) {
          return reply(`⚠️ ${err.message}`);
        }
      }
    }

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    if (muted.includes(alvo)) {
      if (duracaoMs === null) {
        return reply('⚠️ Essa pessoa já está mutada permanentemente.');
      }
      limparTimeout(groupId, alvo);
    }

    if (!muted.includes(alvo)) {
      muted.push(alvo);
      setGroupConfig(groupId, 'muted', muted);
    }

    if (duracaoMs === null) {
      await sock.sendMessage(groupId, {
        text: `🔇 ${nomeUsuario} foi mutado permanentemente e não pode mais enviar mensagens.`,
        mentions: [alvo]
      }, { quoted: msg });
    } else {
      await aplicarMuteTemporario(sock, groupId, alvo, duracaoMs);
      await sock.sendMessage(groupId, {
        text: `🔇 ${nomeUsuario} foi mutado por ${formatarDuracao(duracaoMs)} e será desmutado automaticamente ao final.`,
        mentions: [alvo]
      }, { quoted: msg });
    }
  }
};
