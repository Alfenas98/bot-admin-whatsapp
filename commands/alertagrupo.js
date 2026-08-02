const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'alertagrupo',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);
    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.alertaMudancaGrupo;
    else return reply('Uso: #alertagrupo  (ou on / off)\nAvisa no grupo quando o nome ou a descrição mudam.');
    setGroupConfig(groupId, 'alertaMudancaGrupo', ativo);
    return reply(`🔔 Alerta de mudança no grupo ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
  }
};
