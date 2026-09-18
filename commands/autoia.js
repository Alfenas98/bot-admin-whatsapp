const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'autoia',
  aliases: ['autochat'],
  adminOnly: true,

  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.autoIA;
    else return reply('Uso: #autoia on/off');
    
    setGroupConfig(groupId, 'autoIA', ativo);
    return reply(`🤖 Auto-responder da IA ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
