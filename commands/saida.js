const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'saida',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'mensagem' || opcao === 'msg') {
      const texto = args.slice(1).join(' ');
      if (!texto) return reply('Uso: #saida mensagem <texto>\nUse @user pra mencionar quem saiu.');
      setGroupConfig(groupId, 'saida.mensagem', texto);
      return reply('✅ Mensagem de saída atualizada.');
    }

    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.saida.ativo;
    else return reply('Uso: #saida  (ou on / off / mensagem <texto>)');
    setGroupConfig(groupId, 'saida.ativo', ativo);
    return reply(`👋 Mensagem de saída ${ativo ? 'ATIVADA ✅' : 'DESATIVADA ❌'}`);
  }
};
