const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'desmutar',
  aliases: ['desmute', 'unmute'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Use: #desmutar @pessoa ou #desmutar número');
    }

    const numero = args[0].replace(/[^0-9]/g, '');
    const alvo = numero + '@s.whatsapp.net';

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    if (!muted.includes(alvo)) {
      return reply('⚠️ Essa pessoa não está mutada.');
    }

    const novo = muted.filter(id => id !== alvo);
    setGroupConfig(groupId, 'muted', novo);

    // Resolve o nome real do usuário (se disponível)
    let nomeExibicao = '@' + numero;
    try {
      const perfil = await sock.getAboutMessage(alvo);
      if (perfil && perfil.name) {
        nomeExibicao = perfil.name;
      }
    } catch (e) {
      // Tenta pelo cache do grupo
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participante = metadata.participants?.find(p => p.id === alvo);
        if (participante?.profile) {
          nomeExibicao = participante.profile;
        }
      } catch (err) {
        // Mantém o fallback
      }
    }

    await reply({
      text: `🔊 ${nomeExibicao} foi desmutado e pode enviar mensagens novamente.`,
      mentions: [alvo]
    });
  }
};
