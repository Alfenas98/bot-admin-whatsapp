const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');
const { buscarIdReal } = require('../lib/userUtils');

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

      const lista = Object.entries(grupo)
        .filter(([_, dados]) => dados && dados.mensagens > 0)
        .map(([id, dados]) => ({
          id,
          nivel: dados.nivel || 1,
          mensagens: dados.mensagens || 0,
          nome: dados.nome || null
        }))
        .sort((a, b) => (b.nivel * 10000 + b.mensagens) - (a.nivel * 10000 + a.mensagens))
        .slice(0, 10);

      if (lista.length === 0) {
        return reply('📊 Nenhum membro com mensagens encontrado.');
      }

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < lista.length; i++) {
        const { id, nivel, mensagens, nome } = lista[i];
        
        const displayNome = nome || id.split('@')[0];
        
        // Buscar ID real e mencionar
        const idReal = await buscarIdReal(sock, groupId, id);
        mencoes.push(idReal);
        
        texto += `${i + 1}. ${displayNome} - ${getPatente(nivel)} (Nv ${nivel}, ${mensagens} msgs)\n`;
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
