const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'anticontato',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.anticontato;
    else return reply('Uso: #anticontato  (ou on / off)');
    setGroupConfig(groupId, 'anticontato', ativo);
    return reply(`👤 Anti-contato ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
