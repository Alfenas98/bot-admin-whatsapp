const { jogoEmAndamento, pararJogo } = require('../lib/gameRuntime');

module.exports = {
  name: 'pararjogo',
  adminOnly: true,
  async execute({ sock, groupId, reply }) {
    if (!jogoEmAndamento(groupId)) {
      return reply('Não tem nenhum jogo em andamento nesse grupo.');
    }
    pararJogo(sock, groupId);
  }
};
