const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'anticlone',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.anticlone;
    else return reply('Uso: #anticlone  (ou on / off)\nAvisa quando alguém usa um nome muito parecido com o de um admin.');
    setGroupConfig(groupId, 'anticlone', ativo);
    return reply(`🧬 Anti-clone ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
