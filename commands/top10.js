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

      // Buscar nomes dos participantes
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
        
        // Buscar nome do usuário
        let nome = nomes[id];
        if (!nome) {
          // Tentar buscar pelo número base
          const numeroBase = String(id).split('@')[0].split(':')[0];
          const encontrado = Object.entries(nomes).find(([jid, _]) => 
            jid.startsWith(numeroBase) || numeroBase.startsWith(jid.split('@')[0].split(':')[0])
          );
          nome = encontrado ? encontrado[1] : formatarTelefone(numeroBase);
        }
        
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
