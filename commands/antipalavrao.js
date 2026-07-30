const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antipalavrao',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.antipalavrao;
    else return reply('Uso: #antipalavrao  (ou on / off)\nUse #palavrao pra gerenciar a lista de palavras.');
    setGroupConfig(groupId, 'antipalavrao', ativo);
    return reply(`🤬 Anti-palavrão ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
