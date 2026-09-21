const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    try {
      // Acessar todos os usuários
      const todosUsuarios = db.get('users').value();
      
      if (!todosUsuarios || typeof todosUsuarios !== 'object') {
        return reply('📊 Nenhum dado de ranking encontrado.');
      }

      // Acessar usuários do grupo específico
      const grupo = todosUsuarios[groupId];
      
      if (!grupo) {
        return reply('📊 Nenhum dado de ranking encontrado para este grupo.');
      }

      // Converter para array de [id, dados]
      let entradas;
      if (Array.isArray(grupo)) {
        // Se for array, assumir que cada item tem { id, ... }
        entradas = grupo.filter(item => item && item.id).map(item => [item.id, item]);
      } else if (typeof grupo === 'object') {
        entradas = Object.entries(grupo);
      } else {
        return reply('📊 Formato de dados inválido.');
      }

      const lista = [];
      
      for (const item of entradas) {
        if (!Array.isArray(item) || item.length !== 2) continue;
        
        const [id, dados] = item;
        
        if (!dados) continue;
        
        const mensagens = dados.mensagens || 0;
        if (mensagens <= 0) continue;
        
        const nivel = dados.nivel || 1;
        const xp = dados.xp || 0;
        
        lista.push({ id, nivel, xp, mensagens, pontuacao: nivel * 10000 + xp });
      }

      if (lista.length === 0) {
        return reply('📊 Nenhum membro com mensagens encontrado.');
      }

      lista.sort((a, b) => b.pontuacao - a.pontuacao);
      const top10 = lista.slice(0, 10);

      // Buscar nomes
      const nomes = {};
      try {
        const metadata = await sock.groupMetadata(groupId);
        if (metadata?.participants) {
          for (const p of metadata.participants) {
            if (p?.id) {
              nomes[p.id] = p.pushName || p.id.split('@')[0];
            }
          }
        }
      } catch (e) {}

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < top10.length; i++) {
        const { id, nivel, mensagens } = top10[i];
        const nome = nomes[id] || id.split('@')[0];
        const patente = getPatente(nivel);
        const jid = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(jid);
        
        texto += `${i + 1}. @${id.split('@')[0]} - ${patente} (Nv ${nivel}, ${mensagens} msgs)\n`;
      }

      return await sock.sendMessage(groupId, {
        text: `🏆 *Top 10 do Grupo*\n\n${texto}`,
        mentions: mencoes
      });
    } catch (err) {
      console.error('[top10] Erro:', err.message);
      return reply('⚠️ Erro ao gerar ranking.');
    }
  }
};
