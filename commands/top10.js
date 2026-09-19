const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

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
        pontuacao: (dados.nivel || 1) * 10000 + (dados.xp || 0)
      }))
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, 10);

    if (lista.length === 0) {
      return reply('Ainda não há dados suficientes pro ranking. Ative #levelsystem on e mande mensagens.');
    }

    // Buscar nomes dos participantes
    let metadata;
    try {
      metadata = await sock.groupMetadata(groupId);
    } catch (e) {}

    const nomes = {};
    if (metadata?.participants) {
      for (const p of metadata.participants) {
        nomes[p.id] = p.pushName || p.id.split('@')[0];
      }
    }

    let texto = '';
    const mencoes = [];
    
    lista.forEach(([id, dados], i) => {
      const nome = nomes[id] || id.split('@')[0];
      const patente = getPatente(dados.nivel || 1);
      const mencao = id.includes('@') ? id : `${id}@s.whatsapp.net`;
      mencoes.push(mencao);
      
      texto += `${i + 1}. ${nome} - ${patente} (Nv ${dados.nivel}, ${dados.mensagens} msgs)\n`;
    });

    return await sock.sendMessage(groupId, {
      text: `🏆 *Top 10 do Grupo*\n\n${texto}`,
      mentions: mencoes
    });
  }
};
