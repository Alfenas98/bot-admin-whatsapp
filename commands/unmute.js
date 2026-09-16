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

    if (!numero) {
      return reply('⚠️ Não foi possível identificar o número. Use: #desmutar @pessoa ou #desmutar 5511999998888');
    }

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    // Normaliza para comparação robusta
    const mutedList = muted.map(id => id.replace(/[^0-9]/g, ''));
    const jaMutado = mutedList.includes(numero);

    if (!jaMutado) {
      return reply('⚠️ Essa pessoa não está mutada.');
    }

    // Limpa timeout se existente
    limparTimeout(groupId, alvo);

    // Remove do mute
    const novo = muted.filter(id => !id.includes(numero));
    setGroupConfig(groupId, 'muted', novo);

    // Resolve o nome real do usuário
    let nomeExibicao = null;
    try {
      const metadata = await sock.groupMetadata(groupId);
      const participante = metadata.participants?.find(p => 
        p.id === alvo || p.id.includes(numero)
      );
      if (participante) {
        nomeExibicao = participante.name || participante.profile || participante.pushName;
      }
    } catch (err) {}

    if (!nomeExibicao) {
      try {
        const status = await sock.fetchStatus(alvo);
        if (status && status.name) {
          nomeExibicao = status.name;
        }
      } catch (e) {}
    }

    if (!nomeExibicao) {
      try {
        const contact = await sock.contactQuery(alvo);
        if (contact && contact.name) {
          nomeExibicao = contact.name;
        }
      } catch (e) {}
    }

    if (!nomeExibicao) {
      nomeExibicao = '@' + numero;
    }

    await sock.sendMessage(groupId, {
      text: `🔊 ${nomeExibicao} foi desmutado e pode enviar mensagens novamente.`,
      mentions: [alvo]
    }, { quoted: msg });
  }
};
