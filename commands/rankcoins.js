const { db } = require('../lib/database');

module.exports = {
  name: 'rankcoins',
  aliases: ['rankcoin', 'topcoins', 'maisrico', 'maisricos'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    try {
      const coins = db.get('coins').value() || {};
      const grupoCoins = coins[groupId];
      
      if (!grupoCoins || Object.keys(grupoCoins).length === 0) {
        return reply('💰 Ninguém tem coins ainda. Use #daily para começar!');
      }

      // Converter para array e ordenar
      const lista = Object.entries(grupoCoins)
        .map(([id, dados]) => ({ id, saldo: dados.saldo || 0 }))
        .filter(u => u.saldo > 0)
        .sort((a, b) => b.saldo - a.saldo)
        .slice(0, 10);

      if (lista.length === 0) {
        return reply('💰 Ninguém tem coins ainda. Use #daily para começar!');
      }

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
      
      for (let i = 0; i < lista.length; i++) {
        const { id, saldo } = lista[i];
        const nome = nomes[id] || id.split('@')[0];
        const jid = id.includes('@') ? id : `${id}@s.whatsapp.net`;
        mencoes.push(jid);
        
        const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💰';
        texto += `${emoji} ${i + 1}. @${id.split('@')[0]} — ${saldo} coins\n`;
      }

      return await sock.sendMessage(groupId, {
        text: `🏆 *Ranking dos Mais Ricos*\n\n${texto}`,
        mentions: mencoes
      });
    } catch (err) {
      console.error('[rankcoins] Erro:', err.message);
      return reply('⚠️ Erro ao gerar ranking.');
    }
  }
};
