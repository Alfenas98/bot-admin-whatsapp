const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');
const { buscarNomeUsuario, formatarIdUsuario } = require('../lib/userUtils');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    try {
      const grupo = db.get(['users', groupId]).value();
      
      if (!grupo || typeof grupo !== 'object') {
        return reply('📊 Nenhum dado de ranking encontrado para este grupo.');
      }

      const entradas = Object.entries(grupo);

      const lista = [];
      for (const [id, dados] of entradas) {
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

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < top10.length; i++) {
        const { id, nivel, mensagens } = top10[i];
        
        // Buscar nome: primeiro no banco, depois na metadata
        let nome = await buscarNomeUsuario(sock, groupId, id, null);
        
        // Fallback: formatar ID
        if (!nome) {
          nome = formatarIdUsuario(id);
        }
        
        // Para menção, usar o ID original
        mencoes.push(id);
        
        texto += `${i + 1}. ${nome} - ${getPatente(nivel)} (Nv ${nivel}, ${mensagens} msgs)\n`;
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
