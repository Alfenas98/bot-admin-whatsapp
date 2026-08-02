const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'x9',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.x9;
    else return reply('Uso: #x9  (ou on / off)\nAvisa no grupo quando alguém apaga uma mensagem.');
    setGroupConfig(groupId, 'x9', ativo);
    return reply(`👀 x9 mensagem apagada ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
