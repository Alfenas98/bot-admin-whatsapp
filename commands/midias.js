const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'midias',
  adminOnly: true,
  aliases: ['midiassalvas', 'midiass', 'midiaconfig'],
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'ativo' || opcao === 'ligar') {
      setGroupConfig(groupId, 'midiasSalvas.ativo', true);
      return reply('✅ Salvamento automático de mídias ATIVADO.');
    }

    if (opcao === 'off' || opcao === 'desativo' || opcao === 'desligar') {
      setGroupConfig(groupId, 'midiasSalvas.ativo', false);
      return reply('❌ Salvamento automático de mídias DESATIVADO.');
    }

    const status = config.midiasSalvas?.ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌';
    reply(`📁 Salvamento automático de mídias: ${status}\n\nUse #midias on para ativar\nUse #midias off para desativar\n\nComandos:\n#midias - lista mídias salvas\n#vermidia <numero> - baixa/reenvia mídia\n#limparsalvas - apaga todas as mídias`);
  }
};
