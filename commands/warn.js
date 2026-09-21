const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { adicionarWarn, resetarWarnsExpirados } = require('../lib/warns');
const { registrarAuditoria } = require('../lib/auditLog');

module.exports = {
  name: 'warn',
  aliases: ['advertir'],
  adminOnly: true,
  async execute({ sock, groupId, msg, senderId, reply, args }) {
    const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mencionados.length === 0) return reply('Uso: #warn @usuário [motivo]');

    const config = getGroupConfig(groupId);
    const alvo = mencionados[0];
    const motivo = args.slice(1).join(' ') || 'Sem motivo';
    
    // Resetar warns expirados antes
    resetarWarnsExpirados(groupId, alvo);
    
    const contagem = adicionarWarn(groupId, alvo, motivo);
    const limite = config.warnSystem?.limiteWarns || 3;

    if (contagem >= limite) {
      // Mute temporário de 1 hora antes de remover
      const { adicionarMuteTemporario } = require('../lib/warns');
      adicionarMuteTemporario(groupId, alvo, 60 * 60 * 1000); // 1 hora
      
      try {
        await sock.groupParticipantsUpdate(groupId, [alvo], 'remove');
        await registrarAuditoria(sock, groupId, `@${alvo.split('@')[0]} foi removido automaticamente ao atingir ${contagem} advertências.`);
        return sock.sendMessage(groupId, {
          text: `🚫 @${alvo.split('@')[0]} atingiu ${contagem}/${limite} advertências e foi removido.`,
          mentions: [alvo]
        });
      } catch (err) {
        return reply('⚠️ Usuário atingiu o limite de warns, mas não consegui remover.');
      }
    }

    return sock.sendMessage(groupId, {
      text: `⚠️ @${alvo.split('@')[0]} recebeu advertência (${contagem}/${limite}).\n📝 Motivo: ${motivo}`,
      mentions: [alvo]
    });
  }
};
