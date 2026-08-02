const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'levelsystem',
  aliases: ['level-on'],
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.levelSystem;
    else return reply('Uso: #levelsystem  (ou on / off)');
    setGroupConfig(groupId, 'levelSystem', ativo);
    return reply(`⭐ Sistema de level ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
