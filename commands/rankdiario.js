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
        mensagens: dados.mensagens || 0,
        nome: dados.nome || null
      }))
      .filter(u => u.mensagens > 0)
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10);
    
    if (lista.length === 0) {
      return reply('📊 Nenhuma mensagem registrada hoje. Seja o primeiro a participar!');
    }
    
    const mencoes = [];
    const linhas = [];
    
    for (const { id, nivel, mensagens, nome } of lista) {
      const idNumeros = String(id).split('@')[0].split(':')[0];
      const displayNome = nome || idNumeros;
      
      mencoes.push(`${idNumeros}@s.whatsapp.net`);
      linhas.push(`${linhas.length + 1}. ${displayNome} — ${getPatente(nivel)} (${mensagens} msgs)`);
    }
    
    return await sock.sendMessage(groupId, {
      text: `📊 *Ranking do Dia*\n\n${linhas.join('\n')}`,
      mentions: mencoes
    });
  }
};
