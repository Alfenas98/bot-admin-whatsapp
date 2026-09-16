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

    const numero = args[0].replace(/[^0-9]/g, '');
    
    if (!numero) {
      return reply('⚠️ Não foi possível identificar o usuário. Use: #mutar @pessoa ou #mutar 5511999998888');
    }
    
    const alvo = numero + '@s.whatsapp.net';

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

    // Resolve o nome real do usuário via groupMetadata (priority)
    let nomeUsuario = numero;
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participante = metadata.participants?.find(p => p.id === alvo);
      if (participante) {
        // Usa o nome de exibição do grupo (pushName) se disponível
        if (participante.pushName) nomeUsuario = participante.pushName;
        // Fallback para profile
        else if (participante.profile) nomeUsuario = participante.profile;
      }
    } catch (err) {}

    // Fallback via fetchStatus se não encontrou no grupo
    if (nomeUsuario === numero) {
      try {
        const status = await sock.fetchStatus(alvo);
        if (status && status.name) nomeUsuario = status.name.split(' ')[0]; // Usa primeiro nome
      } catch (e) {}
    }

    // Formata a menção (@nome se resolveram, senão @número)
    const displayName = nomeUsuario !== numero ? nomeUsuario : numero;

    if (duracaoMs === null) {
      await sock.sendMessage(groupId, {
        text: `🔇 ${displayName} foi mutado permanentemente e não pode mais enviar mensagens.`,
        mentions: [alvo]
      }, { quoted: msg });
    } else {
      await aplicarMuteTemporario(sock, groupId, alvo, duracaoMs);
      await sock.sendMessage(groupId, {
        text: `🔇 ${displayName} foi mutado por ${formatarDuracao(duracaoMs)} e será desmutado automaticamente ao final.`,
        mentions: [alvo]
      }, { quoted: msg });
    }
  }
};
