const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'warnsystem',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'limite') {
      const numero = parseInt(args[1], 10);
      if (!numero || numero < 1) return reply('Uso: #warnsystem limite <número>');
      setGroupConfig(groupId, 'warnSystem.limiteWarns', numero);
      return reply(`✅ Limite de warns pra remoção automática ajustado pra ${numero}.`);
    }

    return reply(
      `Limite atual: ${config.warnSystem.limiteWarns} advertências pra remoção automática.\n` +
      `Uso: #warnsystem limite <número>\n` +
      `Comandos: #warn @user | #warns @user | #resetwarn @user`
    );
  }
};
