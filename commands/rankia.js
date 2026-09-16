const axios = require('axios');
const { db, getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'rankia',
  aliases: ['rankbot', 'analiserank'],
  adminOnly: true,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      // Obter dados do ranking do banco
      const usuarios = db.get(['users', groupId]).value() || {};
      const config = getGroupConfig(groupId);

      if (Object.keys(usuarios).length === 0) {
        return reply('📊 Nenhum dado de ranking encontrado ainda.\n\nAtive #levelsystem on e aguarde membros enviarem mensagens.');
      }

      // Preparar dados para análise
      const listaUsuarios = Object.entries(usuarios)
        .filter(([, dados]) => dados.mensagens > 0)
        .sort((a, b) => (b[1].nivel || 1) - (a[1].nivel || 1) || (b[1].xp || 0) - (a[1].xp || 0))
        .slice(0, 20);

      const totalMembros = Object.keys(usuarios).length;
      const totalMsgs = listaUsuarios.reduce((acc, [, d]) => acc + (d.mensagens || 0), 0);
      const nivelMedio = listaUsuarios.length > 0 
        ? (listaUsuarios.reduce((acc, [, d]) => acc + (d.nivel || 1), 0) / listaUsuarios.length).toFixed(1)
        : 0;

      // Top 5 para análise
      const top5 = listaUsuarios.slice(0, 5)
        .map(([id, dados], i) => `${i + 1}. @${id.split('@')[0]} - Nível ${dados.nivel || 1} (${dados.mensagens || 0} msgs)`)
        .join('\n');

      // Montar prompt para a IA
      const prompt = `Analise este ranking de um grupo WhatsApp de forma breve e divertida:

📊 DADOS DO GRUPO:
- Total de membros registrados: ${totalMembros}
- Total de mensagens: ${totalMsgs}
- Nível médio: ${nivelMedio}
- Top 5:
${top5}

Forneça:
1. Uma análise de 2-3 frases sobre a atividade do grupo
2. Uma sugestão prática para melhorar o engajamento
3. Um "membro destaque" do ranking com um elogio criativo

Responda em Português-BR, de forma leve e divertida. Use emojis.`;

      // Chamar API do Gemini
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu analisar o ranking. Tente novamente.');
      }

      return reply(`🤖 *Análise IA do Ranking*\n\n${resposta}`);
    } catch (err) {
      console.error('[rankia] Erro:', err.message);
      if (err.response?.status === 429) {
        return reply('⚠️ Muitas requisições. Aguarde um momento e tente novamente.');
      }
      return reply('⚠️ Erro ao analisar ranking com IA. Tente novamente mais tarde.');
    }
  }
};
