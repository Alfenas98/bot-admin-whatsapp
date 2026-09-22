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

      // Buscar metadata
      const metadata = await sock.groupMetadata(groupId);
      const participantes = metadata?.participants || [];
      
      // Criar mapa: número (apenas dígitos) -> pushName
      const mapaPorNumero = {};
      
      console.log('[top10] === DEBUG PARTICIPANTES ===');
      for (const p of participantes) {
        // Extrair apenas números do ID
        const numero = p.id.split('@')[0].split(':')[0].replace(/\D/g, '');
        const nome = p.pushName || p.name || numero;
        mapaPorNumero[numero] = nome;
        console.log(`[top10] Meta: ${p.id} -> Numero: ${numero} -> Nome: ${nome}`);
      }
      
      console.log('[top10] === DEBUG BANCO ===');
      for (const { id } of top10) {
        const idNumeros = String(id).split('@')[0].split(':')[0].replace(/\D/g, '');
        console.log(`[top10] Banco: ${id} -> Numeros: ${idNumeros}`);
      }

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < top10.length; i++) {
        const { id, nivel, mensagens } = top10[i];
        
        // Extrair apenas números do ID do banco
        const idNumeros = String(id).split('@')[0].split(':')[0].replace(/\D/g, '');
        
        // Buscar nome
        let nome = mapaPorNumero[idNumeros];
        
        // Se não encontrou, tentar partial match
        if (!nome) {
          const encontrado = Object.entries(mapaPorNumero).find(([num, _]) => 
            num.startsWith(idNumeros) || idNumeros.startsWith(num)
          );
          if (encontrado) {
            nome = encontrado[1];
          }
        }
        
        // Fallback
        if (!nome) {
          nome = 'Usuário';
        }
        
        const mentionId = `${idNumeros}@s.whatsapp.net`;
        mencoes.push(mentionId);
        
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
