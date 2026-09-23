const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

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

      // Buscar metadata para obter JIDs corretos
      const metadata = await sock.groupMetadata(groupId);
      const participantes = metadata?.participants || [];
      
      // Criar mapa: número base -> JID completo da metadata
      const mapaJids = {};
      for (const p of participantes) {
        const numeroBase = p.id.split('@')[0].split(':')[0];
        mapaJids[numeroBase] = p.id; // JID completo: 123@lid
      }

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < lista.length; i++) {
        const { id, nivel, mensagens, nome } = lista[i];
        const idNumeros = String(id).split('@')[0].split(':')[0];
        
        // Buscar JID correto na metadata
        const jidCorreto = mapaJids[idNumeros] || id;
        
        const displayNome = nome || idNumeros;
        
        mencoes.push(jidCorreto);
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
