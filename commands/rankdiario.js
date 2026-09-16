const { getRankDiario } = require('../lib/dailyRank');

module.exports = {
  name: 'rankdiario',
  aliases: ['topdiario', 'rankhoje'],
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    const lista = getRankDiario(groupId);

    if (lista.length === 0) {
      return reply('Ainda ninguém mandou mensagem hoje (ou o dia acabou de começar). O ranking reseta toda meia-noite.');
    }

    // Obter nomes dos participantes
    let metadata;
    try {
      metadata = await sock.groupMetadata(groupId);
    } catch (e) {}

    const participantesMap = {};
    if (metadata?.participants) {
      for (const p of metadata.participants) {
        participantesMap[p.id] = p.pushName || p.name || p.id.split('@')[0];
        participantesMap[p.id.replace('@s.whatsapp.net', '')] = p.pushName || p.name || p.id.split('@')[0];
      }
    }

    const mencoes = [];
    const texto = lista
      .map(([id, dados], i) => {
        const nomeReal = participantesMap[id] || participantesMap[id.replace('@s.whatsapp.net', '')] || id.split('@')[0];
        const mencao = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(mencao);
        return `${i + 1}. ${nomeReal} — ${dados.diario.mensagens} mensagem(ns) hoje`;
      })
      .join('\n');

    return await sock.sendMessage(groupId, {
      text: `📅 *Ranking de hoje*\n${texto}\n\n_Reseta à meia-noite._`,
      mentions: mencoes
    });
  }
};
