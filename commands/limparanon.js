const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'limparanon',
  aliases: ['limparhistanon', 'cleananon'],
  adminOnly: true,

  async execute({ groupId, args, reply, getGroupConfig, setGroupConfig }) {
    const config = getGroupConfig(groupId);
    const historico = config.caixaAnonima?.historico || [];

    if (historico.length === 0) {
      return reply('📭 O histórico anônimo já está vazio.');
    }

    const quantidade = historico.length;
    setGroupConfig(groupId, 'caixaAnonima.historico', []);
    return reply(`🧹 Histórico anônimo limpo! ${quantidade} mensagens foram removidas.`);
  }
};
