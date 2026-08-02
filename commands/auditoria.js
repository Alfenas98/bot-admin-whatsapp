const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'auditoria',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'auditoria.ativo', opcao === 'on');
      return reply(`📋 Log de auditoria ${opcao === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }

    if (opcao === 'destino') {
      const numero = (args[1] || '').replace(/\D/g, '');
      if (!numero) {
        setGroupConfig(groupId, 'auditoria.destino', null);
        return reply('✅ Destino resetado — os logs voltam a ser enviados no próprio grupo.');
      }
      const jid = `${numero}@s.whatsapp.net`;
      setGroupConfig(groupId, 'auditoria.destino', jid);
      return reply(`✅ Logs de auditoria passam a ser enviados pro privado de ${numero}.`);
    }

    return reply(
      `Uso: #auditoria on|off\n#auditoria destino <numero> (ou sem número pra resetar)\n\n` +
      `Atual: ${config.auditoria.ativo ? 'ativado' : 'desativado'}, destino: ${config.auditoria.destino || 'este grupo'}\n\n` +
      `Registra: #ban, #promover, #rebaixar, remoção automática por #warn.`
    );
  }
};
