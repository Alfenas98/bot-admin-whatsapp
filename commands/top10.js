const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    try {
      const usuarios = db.get(['users', groupId]).value() || {};

      const lista = Object.entries(usuarios)
        .filter(([, dados]) => dados && dados.mensagens > 0)
        .map(([id, dados]) => ({
          id,
          nivel: dados.nivel || 1,
          xp: dados.xp || 0,
          mensagens: dados.mensagens || 0,
          pontuacao: (dados.nivel || 1) * 10000 + (dados.xp || 0)
        }))
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 10);

      if (lista.length === 0) {
        return reply('📊 Ainda não há dados suficientes pro ranking. Use #levelsystem on para ativar.');
      }

      // Buscar nomes dos participantes
      const nomes = {};
      try {
        const metadata = await sock.groupMetadata(groupId);
        if (metadata?.participants) {
          for (const p of metadata.participants) {
            nomes[p.id] = p.pushName || p.id.split('@')[0];
          }
        }
      } catch (e) {
        console.log('[top10] Erro ao buscar metadata:', e.message);
      }

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < lista.length; i++) {
        const dados = lista[i];
        const id = dados.id;
        const nome = nomes[id] || id.split('@')[0];
        const patente = getPatente(dados.nivel);
        const mencao = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(mencao);
        
        texto += `${i + 1}. ${nome} - ${patente} (Nv ${dados.nivel}, ${dados.mensagens} msgs)\n`;
      }

      return await sock.sendMessage(groupId, {
        text: `🏆 *Top 10 do Grupo*\n\n${texto}`,
        mentions: mencoes
      });
    } catch (err) {
      console.error('[top10] Erro completo:', err.message);
      console.error('[top10] Stack:', err.stack);
      return reply('⚠️ Erro ao gerar ranking. Verifique se o sistema de levels está ativado.');
    }
  }
};
