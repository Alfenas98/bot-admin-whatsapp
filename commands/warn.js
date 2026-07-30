const { getGroupConfig } = require('../lib/database');
const { adicionarWarn } = require('../lib/warns');

module.exports = {
  name: 'warn',
  aliases: ['advertir'],
  adminOnly: true,
  async execute({ sock, groupId, msg, reply }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: marque (@) o usuário junto com #warn');

    const config = getGroupConfig(groupId);
    const alvo = mencionados[0];
    const contagem = adicionarWarn(groupId, alvo);

    if (contagem >= config.warnSystem.limiteWarns) {
      try {
        await sock.groupParticipantsUpdate(groupId, [alvo], 'remove');
        return sock.sendMessage(groupId, {
          text: `🚫 @${alvo.split('@')[0]} atingiu ${contagem}/${config.warnSystem.limiteWarns} advertências e foi removido.`,
          mentions: [alvo]
        });
      } catch (err) {
        return reply('⚠️ Usuário atingiu o limite de warns, mas não consegui remover (confirme se o bot é admin).');
      }
    }

    return sock.sendMessage(groupId, {
      text: `⚠️ @${alvo.split('@')[0]} recebeu advertência (${contagem}/${config.warnSystem.limiteWarns}).`,
      mentions: [alvo]
    });
  }
};
