const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'caixaanon',
  aliases: ['anonbox', 'caixaanonima'],
  adminOnly: true,

  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.caixaAnonima?.ativo;
    else return reply('Uso: #caixaanon (ou #caixaanon on / #caixaanon off)');

    setGroupConfig(groupId, 'caixaAnonima.ativo', ativo);
    return reply(`📬 Caixa anônima ${ativo ? 'ATIVADA ✅' : 'DESATIVADA ❌'}`);
  }
};
