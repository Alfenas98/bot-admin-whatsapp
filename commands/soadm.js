const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'soadm',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.soAdmin;
    else return reply('Uso: #soadm  (ou on / off)\nQuando ativo, só admins podem mandar mensagem no grupo.');
    setGroupConfig(groupId, 'soAdmin', ativo);
    return reply(`🛡️ Só admin manda mensagem ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
