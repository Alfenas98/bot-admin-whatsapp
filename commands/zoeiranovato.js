const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'zoeiranovato',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.zoeiraNovato.ativo;
    else {
      return reply(
        'Uso: #zoeiranovato  (ou on / off)\n\n' +
        '⚠️ A detecção é por nome de exibição no WhatsApp, comparado com uma ' +
        'lista de nomes comuns no Brasil — não é 100% precisa. Vai errar em ' +
        'apelidos, nomes estrangeiros ou quem usa nome fantasia.'
      );
    }
    setGroupConfig(groupId, 'zoeiraNovato.ativo', ativo);
    return reply(`😂 Zoeira de novato ${ativo ? 'ATIVADA ✅' : 'DESATIVADA ❌'}`);
  }
};
