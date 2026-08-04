const { getRelacionamento } = require('../lib/relationships');
const { propor } = require('../lib/relationshipProposals');

module.exports = {
  name: 'namorar',
  adminOnly: false,
  async execute({ sock, groupId, msg, senderId, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) a pessoa que você quer namorar junto com #namorar');

    const alvoId = mencionados[0];
    if (alvoId === senderId) return reply('Você não pode namorar consigo mesmo(a) 😅');

    if (getRelacionamento(groupId, senderId)) {
      return reply('Você já está namorando alguém nesse grupo. Use #terminar antes de propor pra outra pessoa.');
    }
    if (getRelacionamento(groupId, alvoId)) {
      return reply('Essa pessoa já está namorando alguém nesse grupo.');
    }

    propor(groupId, senderId, alvoId);

    return sock.sendMessage(groupId, {
      text: `💍 @${senderId.split('@')[0]} propôs namoro pra @${alvoId.split('@')[0]}!\n@${alvoId.split('@')[0]}, manda #aceitar em até 2 minutos pra confirmar.`,
      mentions: [senderId, alvoId]
    });
  }
};
