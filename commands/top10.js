const { db } = require('../lib/database');
const { getPatente, xpAcumuladoParaNivel, xpParaProximoNivel } = require('../lib/xp');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    const usuarios = db.get(['users', groupId]).value() || {};

    const lista = Object.entries(usuarios)
      .filter(([, dados]) => dados.mensagens > 0)
      .map(([id, dados]) => ({
        id,
        ...dados,
        nivel: dados.nivel || 1,
        xp: dados.xp || 0,
        mensagens: dados.mensagens || 0,
        pontuacao: xpAcumuladoParaNivel(dados.nivel || 1) + (dados.xp || 0)
      }))
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, 10);

    if (lista.length === 0) {
      return reply('Ainda não há dados suficientes pro ranking. Ative #levelsystem on e mande mensagens.');
    }

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
        const patente = getPatente(dados.nivel || 1);
        const xpProximo = xpParaProximoNivel(dados.nivel || 1);
        const mencao = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(mencao);
        return `${i + 1}. ${nomeReal} — ${patente} (Nv ${dados.nivel || 1})`;
      })
      .join('\n');

    return await sock.sendMessage(groupId, {
      text: `🏆 *Top 10 do Grupo*\n\n${texto}`,
      mentions: mencoes
    });
  }
};
