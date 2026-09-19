const { getGroupConfig } = require('../lib/database');
const { 
  calcularInativos, 
  getMembrosParaAvisar, 
  getMembrosParaRemover,
  registrarAviso
} = require('../lib/inactivityChecker');

module.exports = {
  name: 'inativos',
  aliases: ['limparinativos'],
  adminOnly: true,

  async execute({ sock, groupId, msg, args, reply }) {
    const config = getGroupConfig(groupId);
    const acao = (args[0] || 'listar').toLowerCase();
    
    // Verificar se o sistema está ativo
    if (!config.inatividade.ativo) {
      return reply(
        '⚠️ O sistema de inatividade está desativado.\n' +
        'Use #inatividade on para ativar.'
      );
    }

    const metadata = await sock.groupMetadata(groupId);
    const botId = sock.user.id;

    if (acao === 'avisa' || acao === 'avisar') {
      // Avisar membros inativos
      const paraAvisar = getMembrosParaAvisar(
        groupId,
        metadata.participants,
        botId,
        config.inatividade.diasLimite
      );

      if (paraAvisar.length === 0) {
        return reply('✅ Nenhum membro para avisar no momento.');
      }

      let avisados = 0;
      for (const membro of paraAvisar) {
        try {
          await sock.sendMessage(groupId, {
            text: `⚠️ @${membro.split('@')[0]} você está inativo há mais de ${config.inatividade.diasLimite} dias neste grupo.\n\n` +
                  'Se não enviar mensagem nas próximas 24 horas, será removido automaticamente.',
            mentions: [membro]
          });
          
          registrarAviso(groupId, membro);
          avisados++;
        } catch (e) {}
      }

      return reply(
        `📨 ${avisados} membro(s) avisado(s) sobre inatividade.\n` +
        `Eles têm 24 horas antes de serem removidos.`
      );
    }

    if (acao === 'remover' || acao === 'limpar') {
      // Remover apenas quem já foi avisado há +24h
      const paraRemover = getMembrosParaRemover(
        groupId,
        metadata.participants,
        botId,
        config.inatividade.diasLimite
      );

      if (paraRemover.length === 0) {
        return reply(
          '✅ Nenhum membro pode ser removido ainda.\n' +
          'Eles precisam ser avisados primeiro com #inativos avisar\n' +
          'e aguardar 24 horas.'
        );
      }

      let removidos = 0;
        let erros = 0;
      
        for (const membro of paraRemover) {
          try {
            await sock.groupParticipantsUpdate(groupId, [membro], 'remove');
          
            // Notificar grupo
            const texto = '🧹 @' + membro.split('@')[0] + ' foi removido por inatividade (' + config.inatividade.diasLimite + '+ dias sem mensagem).';
            await sock.sendMessage(groupId, {
              text: texto,
              mentions: [membro]
            });
          
            removidos++;
          } catch (e) {
            erros++;
          }
        }

      return reply(
        `✅ ${removidos} membro(s) removido(s) por inatividade.` +
        (erros > 0 ? `\n⚠️ ${erros} erro(s) (verifique se o bot é admin).` : '')
      );
    }

    if (acao === 'verificar' || acao === 'check') {
      // Verificar e avisar automaticamente
      const metadata = await sock.groupMetadata(groupId);
      
      const paraAvisar = getMembrosParaAvisar(
        groupId,
        metadata.participants,
        botId,
        config.inatividade.diasLimite
      );
      
      const paraRemover = getMembrosParaRemover(
        groupId,
        metadata.participants,
        botId,
        config.inatividade.diasLimite
      );

      let msg = `🔍 *Verificação de Inatividade*\n\n`;
      msg += `⏳ Limite: ${config.inatividade.diasLimite} dias\n`;
      msg += `📨 Para avisar: ${paraAvisar.length} membro(s)\n`;
      msg += `🧹 Para remover: ${paraRemover.length} membro(s)\n\n`;
      
      if (paraAvisar.length > 0) {
        msg += `Para avisar: #inativos avisar\n`;
      }
      if (paraRemover.length > 0) {
        msg += `Para remover: #inativos remover\n`;
      }
      
      return reply(msg);
    }

    // Listar inativos (padrão)
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

    const lista = inativos.map(id => `• @${id.split('@')[0]}`).join('\n');
    
    return await sock.sendMessage(groupId, {
      text: 
        `⏳ *Membros inativos* (${config.inatividade.diasLimite}+ dias)\n\n` +
        `${lista}\n\n` +
        `📨 #inativos avisar - Avisar antes de remover\n` +
        `🧹 #inativos remover - Remover quem já foi avisado`,
      mentions: inativos
    });
  }
};
