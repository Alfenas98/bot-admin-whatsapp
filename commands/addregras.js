const { getGroupConfig, setGroupConfig } = require('../../lib/database');

module.exports = {
  name: 'addregras',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const texto = args.join(' ').trim();

    if (!texto) {
      return reply('⚠️ Use: #addregras <texto das regras>');
    }

    setGroupConfig(groupId, 'regras', texto);
    await reply('✅ Regras do grupo atualizadas com sucesso!');
  }
};