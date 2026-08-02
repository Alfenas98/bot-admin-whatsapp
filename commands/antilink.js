const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'antilink',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    // Sem argumento -> alterna (liga se tava off, desliga se tava on)
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.antilink;
    else return reply('Uso: #antilink  (ou #antilink on / #antilink off)');

    setGroupConfig(groupId, 'antilink', ativo);
    return reply(`🔗 Anti-link ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
