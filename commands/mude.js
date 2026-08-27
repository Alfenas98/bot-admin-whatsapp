const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'mute',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Use: #mute @pessoa ou #mute número');
    }

    const numero = args[0].replace(/[^0-9]/g, '');
    const alvo = numero + '@s.whatsapp.net';

    const config = getGroupConfig(groupId);
    const muted = config.muted || [];

    if (muted.includes(alvo)) {
      return reply('⚠️ Essa pessoa já está mutada.');
    }

    muted.push(alvo);
    setGroupConfig(groupId, 'muted', muted);

    await reply(`🔇 @${numero} foi mutado e não pode mais enviar mensagens.`);
  }
};