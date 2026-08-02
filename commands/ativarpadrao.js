const { setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'ativarpadrao',
  adminOnly: true,
  async execute({ groupId, reply }) {
    setGroupConfig(groupId, 'x9', true);
    setGroupConfig(groupId, 'antimidia.documento', true);
    setGroupConfig(groupId, 'anticlone', true);
    setGroupConfig(groupId, 'boasvindas.ativo', true);
    setGroupConfig(groupId, 'saida.ativo', true);

    return reply(
      '✅ Funções padrão ativadas:\n' +
      '👀 x9\n' +
      '📄 antidocumento\n' +
      '🧬 anticlone\n' +
      '🤳 boasvindas\n' +
      '👋 saida'
    );
  }
};
