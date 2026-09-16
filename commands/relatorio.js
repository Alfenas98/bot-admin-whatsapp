const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'relatorio',
  aliases: ['relatorio', 'stats', 'estatisticas'],
  adminOnly: true,
  async execute({ sock, msg, groupId, args, reply }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#relatorio - Relatório geral do grupo\n#relatorio top - Top 10 membros ativos');
    }

    const sub = args[0].toLowerCase();

    // Top membros ativos
    if (sub === 'top' || sub === 'ativos') {
      const usuarios = getGroupConfig(groupId).__test__?.users || {};
      const lista = Object.entries(usuarios)
        .filter(([, dados]) => dados.mensagens > 0)
        .sort((a, b) => (b[1].mensagens || 0) - (a[1].mensagens || 0))
        .slice(0, 10);

      if (lista.length === 0) {
        return reply('📊 Nenhum dado de atividade ainda.');
      }

      const texto = lista.map(([id, dados], i) => 
        `${i + 1}. @${id.split('@')[0]} — ${dados.mensagens} mensagem(ns) (${dados.nivel || 1} lvl)`
      ).join('\n');

      await sock.sendMessage(groupId, {
        text: `📊 *Top 10 membros ativos:*\n${texto}`,
        mentions: lista.map(([id]) => id)
      }, { quoted: msg });
      return;
    }

    // Relatório geral
    const config = getGroupConfig(groupId);
    
    // Coleta estatísticas
    const usuarios = {}; // db.get(['users', groupId]).value() || {}; // descomente se usar users no db
    const listaUsuarios = Object.entries(usuarios);
    const totalMensagens = listaUsuarios.reduce((sum, [, d]) => sum + (d.mensagens || 0), 0);
    
    // Conta membros do grupo
    let totalMembros = 0;
    try {
      const metadata = await sock.groupMetadata(groupId);
      totalMembros = metadata.participants?.length || 0;
    } catch (e) {
      console.error('[relatorio] Falha ao obter metadata:', e.message);
    }

    const muteCount = (config.muted || []).length;
    const blocklistCount = (config.blocklist || []).length;
    const quotesCount = (config.quotes || []).length;
    const lembretesCount = (config.lembretes || []).length;

    const horarioAgora = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });

    const relatorio = [
      '📊 *RELATÓRIO DO GRUPO*',
      `🕐 Gerado: ${horarioAgora}`,
      ``,
      `👥 *Membros:* ${totalMembros}`,
      `💬 *Mensagens registradas:* ${totalMensagens}`,
      ``,
      `🔇 *Mutados:* ${muteCount}`,
      `🚫 *Lista negra:* ${blocklistCount}`,
      `💾 *Citações salvas:* ${quotesCount}`,
      `🔔 *Lembretes ativos:* ${lembretesCount}`,
      ``,
      `📈 Use #relatorio top para ver os membros mais ativos.`
    ].join('\n');

    await sock.sendMessage(groupId, {
      text: relatorio
    }, { quoted: msg });
  }
};
