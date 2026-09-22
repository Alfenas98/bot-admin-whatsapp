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
    
    const metadata = await sock.groupMetadata(groupId);
    const participantes = metadata?.participants || [];
    
    // Criar mapa: numero -> pushName
    const mapaParticipantes = {};
    for (const p of participantes) {
      const numero = p.id.split('@')[0].split(':')[0];
      mapaParticipantes[numero] = p.pushName || p.name || numero;
    }
    
    const mencoes = [];
    const linhas = [];
    
    for (const { id, nivel, mensagens } of lista) {
      const idNumeros = String(id).split('@')[0].split(':')[0];
      
      let nome = mapaParticipantes[idNumeros];
      if (!nome) {
        const encontrado = Object.entries(mapaParticipantes).find(([num, _]) => 
          num.startsWith(idNumeros) || idNumeros.startsWith(num)
        );
        nome = encontrado ? encontrado[1] : 'Usuário';
      }
      
      mencoes.push(`${idNumeros}@s.whatsapp.net`);
      linhas.push(`${linhas.length + 1}. ${nome} — ${getPatente(nivel)} (${mensagens} msgs)`);
    }
    
    return await sock.sendMessage(groupId, {
      text: `📊 *Ranking do Dia*\n\n${linhas.join('\n')}`,
      mentions: mencoes
    });
  }
};
