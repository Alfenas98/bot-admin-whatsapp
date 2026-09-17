const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { limparTimeout } = require('../lib/timeoutMute');

module.exports = {
  name: 'autodesmutar',
  aliases: ['desmutar', 'unmute'],
  adminOnly: false,

  async execute({ sock, msg, groupId, senderId, reply }) {
    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    // Verificar se o usuário está mutado
    const numeroRemetente = senderId.replace('@s.whatsapp.net', '');
    const idCompleto = muted.find(id => id.replace(/[^0-9]/g, '') === numeroRemetente);

    if (!idCompleto) {
      return reply('⚠️ Você não está mutado.');
    }

    // Desmutar o usuário
    limparTimeout(groupId, idCompleto);
    const novo = muted.filter(id => id.replace(/[^0-9]/g, '') !== numeroRemetente);
    setGroupConfig(groupId, 'mutado', novo);

    await sock.sendMessage(groupId, {
      text: `🔊 @${numeroRemetente} se desmutou!`,
      mentions: [idCompleto]
    });
  }
};
