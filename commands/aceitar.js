const { consumirProposta } = require('../lib/relationshipProposals');
const { definirRelacionamento, definirCasamento } = require('../lib/relationships');

module.exports = {
  name: 'aceitar',
  adminOnly: false,
  async execute({ sock, groupId, senderId, reply }) {
    const proposta = consumirProposta(groupId, senderId);
    if (!proposta) return reply('Você não tem nenhuma proposta pendente (ou ela já expirou).');

    const { deId, tipo } = proposta;

    if (tipo === 'casamento') {
      definirCasamento(groupId, senderId, deId);
      return sock.sendMessage(groupId, {
        text: `💒 @${senderId.split('@')[0]} e @${deId.split('@')[0]} agora são marido e mulher! Parabéns aos noivos 🎉👰🤵`,
        mentions: [senderId, deId]
      });
    }

    definirRelacionamento(groupId, senderId, deId);
    return sock.sendMessage(groupId, {
      text: `💖 @${senderId.split('@')[0]} e @${deId.split('@')[0]} agora estão namorando! Parabéns ao casal 🎉`,
      mentions: [senderId, deId]
    });
  }
};
