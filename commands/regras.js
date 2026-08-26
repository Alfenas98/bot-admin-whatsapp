const { getGroupConfig } = require('../../lib/database');

module.exports = {
  name: 'regras',
  adminOnly: false,
  async execute({ groupId, reply }) {
    const config = getGroupConfig(groupId);
    const regras = config.regras;

    if (!regras) {
      return reply('📋 Nenhuma regra cadastrada para este grupo.\nUm admin pode usar #addregras para definir.');
    }

    await reply(`📋 *REGRAS DO GRUPO*\n\n${regras}`);
  }
};