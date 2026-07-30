const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'inatividade',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'inatividade.ativo', opcao === 'on');
      return reply(
        `⏳ Detecção de inatividade ${opcao === 'on' ? 'ATIVADA ✅' : 'DESATIVADA ❌'}\n` +
        `Limite atual: ${config.inatividade.diasLimite} dias sem mensagem.\n` +
        (opcao === 'on'
          ? 'A checagem roda automaticamente todo dia. Use #inativos pra rodar na hora.'
          : '')
      );
    }

    if (opcao === 'dias') {
      const dias = parseInt(args[1], 10);
      if (!dias || dias < 1) return reply('Uso: #inatividade dias <número>');
      setGroupConfig(groupId, 'inatividade.diasLimite', dias);
      return reply(`✅ Limite ajustado pra ${dias} dias sem mensagem.`);
    }

    return reply(
      `Uso: #inatividade on|off\n#inatividade dias <número>\n\n` +
      `Atual: ${config.inatividade.ativo ? 'ativado' : 'desativado'}, ${config.inatividade.diasLimite} dias.\n\n` +
      `⚠️ Admins nunca são removidos por esta função. Membros sem histórico ` +
      `de atividade (recém-detectados) não são removidos na primeira checagem.`
    );
  }
};
