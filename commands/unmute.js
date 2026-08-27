const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'unmute',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Use: #unmute @pessoa ou #unmute número');
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

    await reply(`🔊 @${numero} foi desmutado e pode enviar mensagens novamente.`);
  }
};