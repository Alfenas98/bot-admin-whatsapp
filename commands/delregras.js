const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'delregras',
  adminOnly: true,
  async execute({ groupId, reply }) {
    const config = getGroupConfig(groupId);

    if (!config.regras) {
      return reply('📋 Nenhuma regra cadastrada para este grupo.');
    }

    setGroupConfig(groupId, 'regras', '');
    await reply('🗑️ Regras do grupo removidas com sucesso!');
  }
};
