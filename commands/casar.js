const { getRelacionamento } = require('../lib/relationships');
const { propor } = require('../lib/relationshipProposals');

module.exports = {
  name: 'casar',
  aliases: ['pedircasamento'],
  adminOnly: false,
  async execute({ sock, groupId, msg, senderId, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) seu parceiro(a) junto com #casar');

    const alvoId = mencionados[0];
    const relAtual = getRelacionamento(groupId, senderId);

    if (!relAtual || relAtual.parceiroId !== alvoId) {
      return reply('Vocês precisam estar namorando um(a) o(a) outro(a) antes de casar. Use #namorar primeiro.');
    }
    if (relAtual.casado) {
      return reply('Vocês já são casados! 💍');
    }

    propor(groupId, senderId, alvoId, 'casamento');

    return sock.sendMessage(groupId, {
      text: `💒 @${senderId.split('@')[0]} pediu @${alvoId.split('@')[0]} em casamento!\n@${alvoId.split('@')[0]}, manda #aceitar em até 2 minutos pra confirmar o "sim"!`,
      mentions: [senderId, alvoId]
    });
  }
};
