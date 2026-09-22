const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

module.exports = {
  name: 'rankdiario',
  aliases: ['topdiario', 'rankhoje'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    const usuarios = db.get(['users', groupId]).value() || {};
    
    const lista = Object.entries(usuarios)
      .map(([id, dados]) => ({
        id,
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
        if (p?.id) {
          participantesMap[p.id] = p.pushName || p.name || p.id.split('@')[0];
        }
      }
    }
    
    const mencoes = [];
    const linhas = [];
    
    for (const { id, nivel, mensagens } of lista) {
      let nome = participantesMap[id];
      if (!nome) {
        const numeroBase = String(id).split('@')[0].split(':')[0];
        const encontrado = Object.entries(participantesMap).find(([jid, _]) => 
          jid.startsWith(numeroBase) || numeroBase.startsWith(jid.split('@')[0].split(':')[0])
        );
        nome = encontrado ? encontrado[1] : formatarTelefone(numeroBase);
      }
      
      mencoes.push(id.includes('@') ? id : `${id}@s.whatsapp.net`);
      linhas.push(`${linhas.length + 1}. ${nome} — ${getPatente(nivel)} (${mensagens} msgs)`);
    }
    
    return await sock.sendMessage(groupId, {
      text: `📊 *Ranking do Dia*\n\n${linhas.join('\n')}`,
      mentions: mencoes
    });
  }
};

function formatarTelefone(numero) {
  if (!numero) return 'Desconhecido';
  const limpo = String(numero).replace(/\D/g, '');
  if (limpo.length > 15 || !/^\d+$/.test(limpo)) return 'Usuário';
  if (limpo.length === 13 && limpo.startsWith('55')) {
    const ddd = limpo.substring(2, 4);
    const num = limpo.substring(4);
    return `(${ddd}) *****-${num.substring(num.length - 4)}`;
  }
  if (limpo.length > 4) return `****${limpo.substring(limpo.length - 4)}`;
  return limpo;
}
