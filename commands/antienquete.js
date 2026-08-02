const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antienquete',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.antienquete;
    else return reply('Uso: #antienquete  (ou on / off)');
    setGroupConfig(groupId, 'antienquete', ativo);
    return reply(`📊 Anti-enquete ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
