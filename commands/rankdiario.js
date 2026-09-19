const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

module.exports = {
  name: 'rankdiario',
  aliases: ['topdiario', 'rankhoje'],
  adminOnly: false,
  async execute({ sock, groupId, reply }) {
    const hoje = new Date().toDateString();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataOntem = ontem.toDateString();
    
    const usuarios = db.get(['users', groupId]).value() || {};
    
    // Filtrar mensagens de hoje (desde a meia-noite)
    const lista = Object.entries(usuarios)
      .map(([id, dados]) => ({
        id,
        ...dados,
        nivel: dados.nivel || 1,
        mensagens: dados.mensagens || 0
      }))
      .filter(u => u.mensagens > 0)
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10);
    
    if (lista.length === 0) {
      return reply('📊 Nenhuma mensagem registrada hoje. Seja o primeiro a participar!');
    }
    
    let metadata;
    try {
      metadata = await sock.groupMetadata(groupId);
    } catch (e) {}
    
    const participantesMap = {};
    if (metadata?.participants) {
      for (const p of metadata.participants) {
        participantesMap[p.id] = p.pushName || p.name || p.id.split('@')[0];
      }
    }
    
    const mencoes = [];
    const texto = lista
      .map(([id, dados], i) => {
        const nomeReal = participantesMap[id] || id.split('@')[0];
        const patente = getPatente(dados.nivel || 1);
        const mencao = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(mencao);
        return `${i + 1}. ${nomeReal} — ${patente} (${dados.mensagens} msgs)`;
      })
      .join('\n');
    
    return await sock.sendMessage(groupId, {
      text: `📊 *Ranking do Dia*\n\n${texto}`,
      mentions: mencoes
    });
  }
};
