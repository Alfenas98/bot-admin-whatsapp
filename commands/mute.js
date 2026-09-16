const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { parseDuracao, formatarDuracao, aplicarMuteTemporario, limparTimeout } = require('../lib/timeoutMute');

module.exports = {
  name: 'mutar',
  aliases: ['mute'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso: #mutar @pessoa [tempo]\nTempo: 10m, 2h, 1d ou "perm" para mute permanente\nEx: #mutar @jose 10m  |  #mutar 5511999998888 30m  |  #mutar @jose perm');
    }

    const numero = args[0].replace(/[^0-9]/g, '');
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
      // Renova o timeout
      limparTimeout(groupId, alvo); // limpa o anterior
    }

    if (!muted.includes(alvo)) {
      muted.push(alvo);
      setGroupConfig(groupId, 'muted', muted);
    }

    // Resolve o nome real do usuário (try group metadata first — faster)
    let nomeExibicao = '@' + numero;
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participante = metadata.participants?.find(p => p.id === alvo);
      if (participante?.profile) {
        nomeExibicao = participante.profile;
      }
    } catch (err) {
      // Fallback para fetchStatus
    }
    
    // Se ainda não resolveu, tenta via fetchStatus
    if (nomeExibicao === '@' + numero) {
      try {
        const status = await sock.fetchStatus(alvo);
        if (status && status.name) {
          nomeExibicao = status.name;
        }
      } catch (e) {
        // Mantém o fallback
      }
    }

    if (duracaoMs === null) {
      await reply({
        text: `🔇 ${nomeExibicao} foi mutado permanentemente e não pode mais enviar mensagens.`,
        mentions: [alvo]
      });
    } else {
      await aplicarMuteTemporario(sock, groupId, alvo, duracaoMs, reply);
      await reply({
        text: `🔇 ${nomeExibicao} foi mutado por ${formatarDuracao(duracaoMs)} e foi desmutado automaticamente ao final.`,
        mentions: [alvo]
      });
    }
  }
};
