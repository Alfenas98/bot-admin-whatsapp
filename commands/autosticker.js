const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'autosticker',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.autosticker;
    else return reply('Uso: #autosticker  (ou on / off)\nConverte toda imagem enviada em figurinha automaticamente.');
    setGroupConfig(groupId, 'autosticker', ativo);
    return reply(`🖼️➡️🧩 Auto-sticker ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
