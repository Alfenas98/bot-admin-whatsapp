const { db } = require('../lib/database');
const { getPatente } = require('../lib/xp');

module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,

  async execute({ sock, groupId, reply }) {
    try {
      // Debug: verificar estrutura
      const todosUsuarios = db.get('users').value();
      console.log('[top10] Estrutura users:', typeof todosUsuarios, Object.keys(todosUsuarios || {}));
      
      // Acessar usuários do grupo
      const grupo = todosUsuarios?.[groupId];
      console.log('[top10] Grupo encontrado:', typeof grupo, grupo ? Object.keys(grupo).length : 0);
      
      if (!grupo) {
        return reply('📊 Nenhum dado de ranking encontrado. Use #levelsystem on para ativar.');
      }

      // Verificar se é array (formato antigo) e converter para objeto
      let dadosGrupo = grupo;
      if (Array.isArray(grupo)) {
        // Converter array para objeto se necessário
        dadosGrupo = {};
        for (const item of grupo) {
          if (item && item.id) {
            dadosGrupo[item.id] = item;
          }
        }
        console.log('[top10] Convertido array para objeto. Itens:', Object.keys(dadosGrupo).length);
      }
      
      if (typeof dadosGrupo !== 'object') {
        return reply('📳 Formato de dados incorreto. Use #levelsystem on para resetar.');
      }

      const entradas = Object.entries(dadosGrupo);
      
      if (entradas.length === 0) {
        return reply('📊 Nenhum membro encontrado no ranking.');
      }

      const lista = [];
      
      for (const item of entradas) {
        if (!Array.isArray(item) || item.length < 2) continue;
        
        const id = item[0];
        const dados = item[1];
        
        if (!dados || typeof dados !== 'object') continue;
        
        const mensagens = dados.mensagens || 0;
        if (mensagens <= 0) continue;
        
        const nivel = dados.nivel || 1;
        const xp = dados.xp || 0;
        
        lista.push({
          id,
          nivel,
          xp,
          mensagens,
          pontuacao: nivel * 10000 + xp
        });
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
        if (metadata && metadata.participants) {
          for (const p of metadata.participants) {
            if (p && p.id) {
              nomes[p.id] = p.pushName || p.id.split('@')[0];
            }
          }
        }
      } catch (e) {
        console.log('[top10] Erro metadata:', e.message);
      }

      let texto = '';
      const mencoes = [];
      
      for (let i = 0; i < top10.length; i++) {
        const dados = top10[i];
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
      return reply('⚠️ Erro ao gerar ranking. Tente novamente.');
    }
  }
};
