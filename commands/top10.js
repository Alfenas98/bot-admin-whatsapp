const { db } = require('../lib/database');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    const usuarios = db.get(['users', groupId]).value() || {};

    const lista = Object.entries(usuarios)
      .filter(([, dados]) => dados.mensagens > 0)
      .sort((a, b) => (b[1].nivel || 1) - (a[1].nivel || 1) || (b[1].xp || 0) - (a[1].xp || 0))
      .slice(0, 10);

    if (lista.length === 0) {
      return reply('Ainda não há dados suficientes pro ranking. Ative #levelsystem on e mande mensagens.');
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
        return `${i + 1}. ${nomeReal} — nível ${dados.nivel || 1} (${dados.mensagens} msgs)`;
      })
      .join('\n');

    return await sock.sendMessage(groupId, {
      text: `🏆 *Top 10 do grupo*\n${texto}`,
      mentions: mencoes
    });
  }
};
