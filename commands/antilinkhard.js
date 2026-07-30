const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antilinkhard',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.antilinkhard;
    else return reply('Uso: #antilinkhard  (ou on / off)');
    setGroupConfig(groupId, 'antilinkhard', ativo);
    return reply(`🧱 Anti-link hard (bloqueia TODO link) ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
