const { getGroupConfig } = require('../lib/database');
const { calcularInativos } = require('../lib/inactivityChecker');

module.exports = {
  name: 'inativos',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    const config = getGroupConfig(groupId);
    const acao = (args[0] || 'listar').toLowerCase();

    const metadata = await sock.groupMetadata(groupId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    const { inativos, semDados } = calcularInativos(
      groupId,
      metadata.participants,
      botId,
      config.inatividade.diasLimite
    );

    if (inativos.length === 0) {
      return reply(
        `✅ Nenhum membro inativo há mais de ${config.inatividade.diasLimite} dias.\n` +
        (semDados.length > 0 ? `(${semDados.length} membro(s) começaram a ser rastreados agora)` : '')
      );
    }

    if (acao === 'remover') {
      try {
        await sock.groupParticipantsUpdate(groupId, inativos, 'remove');
        return reply(`🧹 ${inativos.length} membro(s) inativo(s) removido(s).`);
      } catch (err) {
        return reply('⚠️ Não consegui remover. Confirme que o bot é admin do grupo.');
      }
    }

    const lista = inativos.map(id => `• @${id.split('@')[0]}`).join('\n');
    return sock.sendMessage(groupId, {
      text: `⏳ ${inativos.length} membro(s) inativo(s) há mais de ${config.inatividade.diasLimite} dias:\n${lista}\n\nUse #inativos remover pra removê-los.`,
      mentions: inativos
    });
  }
};
