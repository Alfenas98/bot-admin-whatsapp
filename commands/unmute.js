const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { limparTimeout } = require('../lib/timeoutMute');

module.exports = {
  name: 'desmutar',
  aliases: ['desmute', 'unmute'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso: #desmutar @pessoa ou #desmutar número');
    }

    const numero = args[0].replace(/[^0-9]/g, '');
    const alvo = numero + '@s.whatsapp.net';

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    if (!muted.includes(alvo)) {
      return reply('⚠️ Essa pessoa não está mutada.');
    }

    // Limpa timeout se existente
    limparTimeout(groupId, alvo);

    // Remove do mute
    const novo = muted.filter(id => id !== alvo);
    setGroupConfig(groupId, 'muted', novo);

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

    await reply({
      text: `🔊 ${nomeExibicao} foi desmutado e pode enviar mensagens novamente.`,
      mentions: [alvo]
    });
  }
};
