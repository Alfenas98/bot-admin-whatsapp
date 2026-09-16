const axios = require('axios');
const { db, getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'rankia',
  aliases: ['rankbot', 'analiserank'],
  adminOnly: true,

  async execute({ sock, groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      // Obter metadata real do grupo
      let metadata;
      try {
        metadata = await sock.groupMetadata(groupId);
      } catch (e) {
        return reply('⚠️ Não foi possível obter dados do grupo. Verifique se o bot é admin.');
      }

      const participantes = metadata.participants || [];
      const totalParticipantes = participantes.length;

      // Obter dados do ranking do banco
      const usuarios = db.get(['users', groupId]).value() || {};

      if (Object.keys(usuarios).length === 0) {
        return reply('📊 Nenhum dado de ranking encontrado ainda.\n\nAtive #levelsystem on e aguarde membros enviarem mensagens.');
      }

      // Preparar dados para análise com nomes reais
      const listaUsuarios = Object.entries(usuarios)
        .filter(([, dados]) => dados.mensagens > 0)
        .sort((a, b) => (b[1].nivel || 1) - (a[1].nivel || 1) || (b[1].xp || 0) - (a[1].xp || 0))
        .slice(0, 20);

      const totalMsgs = listaUsuarios.reduce((acc, [, d]) => acc + (d.mensagens || 0), 0);
      const nivelMedio = listaUsuarios.length > 0
        ? (listaUsuarios.reduce((acc, [, d]) => acc + (d.nivel || 1), 0) / listaUsuarios.length).toFixed(1)
        : 0;

      // Criar mapa de participantes para obter nomes e IDs
      const participantesMap = {};
      for (const p of participantes) {
        participantesMap[p.id] = p.pushName || p.name || p.id.split('@')[0];
        // Também mapear sem @s.whatsapp.net para busca
        participantesMap[p.id.replace('@s.whatsapp.net', '')] = p.pushName || p.name || p.id.split('@')[0];
      }

      // Top 5 com nomes reais e menções
      const mencoes = [];
      const top5Data = listaUsuarios.slice(0, 5).map(([id, dados], i) => {
        const nomeReal = participantesMap[id] || participantesMap[id.replace('@s.whatsapp.net', '')] || id.split('@')[0];
        const numeroWhatsapp = id.replace('@s.whatsapp.net', '');
        mencoes.push(id.includes('@') ? id : `${id}@s.whatsapp.net`);
        return { nome: nomeReal, nivel: dados.nivel || 1, msgs: dados.mensagens || 0, numero: numeroWhatsapp };
      });

      const top5 = top5Data.map((u, i) => `${i + 1}. ${u.nome} - Nível ${u.nivel} (${u.msgs} msgs)`).join('\n');

      // Membros ativos vs inativos
      const membrosAtivos = top5Data.length;
      const membrosInativos = totalParticipantes - membrosAtivos;

      // Montar prompt para a IA com dados precisos
      const prompt = `Analise este ranking de um grupo WhatsApp de forma breve e divertida:

📊 DADOS PRECISOS DO GRUPO:
- Total de participantes no grupo: ${totalParticipantes}
- Membros ativos (com msgs): ${membrosAtivos}
- Membros inativos (sem msgs): ${membrosInativos}
- Total de mensagens: ${totalMsgs}
- Nível médio: ${nivelMedio}
- Top 5:
${top5}

IMPORTANTE: Use EXATAMENTE os números acima. NÃO invente números.
CRÍTICO: NÃO inclua IDs de usuário (números como @123456789) na resposta. Use APENAS os nomes dos membros.

Forneça:
1. Uma análise de 2-3 frases sobre a atividade do grupo
2. Uma sugestão prática para melhorar o engajamento
3. Um "membro destaque" do ranking usando APENAS o nome (ex: "Destaque para João!") com um elogio criativo

Responda em Português-BR, de forma leve e divertida. Use emojis.`;

      // Chamar API do Gemini
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resposta) {
        return reply('⚠️ A IA não conseguiu analisar o ranking. Tente novamente.');
      }

      // Enviar com menções (apenas dos tops, a IA não deve incluir IDs)
      const textoFinal = `🤖 *Análise IA do Ranking*\n\n${resposta}`;

      return await sock.sendMessage(groupId, {
        text: textoFinal,
        mentions: mencoes
      });
    } catch (err) {
      console.error('[rankia] Erro:', err.message);
      if (err.response?.status === 429) {
        return reply('⚠️ Muitas requisições. Aguarde um momento e tente novamente.');
      }
      return reply('⚠️ Erro ao analisar ranking com IA. Tente novamente mais tarde.');
    }
  }
};
