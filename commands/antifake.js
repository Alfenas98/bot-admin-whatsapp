const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antifake',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.antifake;
    else return reply(`Uso: #antifake  (ou on / off)\nDDIs permitidos hoje: ${config.ddiPermitidos.join(', ')}`);
    setGroupConfig(groupId, 'antifake', ativo);
    return reply(`🧩 Anti-fake ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}\nDDIs permitidos: ${config.ddiPermitidos.join(', ')} (use #ddi <código> pra adicionar)`);
  }
};
