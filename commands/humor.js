const axios = require('axios');

module.exports = {
  name: 'humor',
  aliases: ['mood', 'sentimento', 'atmosfera'],
  adminOnly: false,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      const prompt = `Analise o "humor" de um grupo WhatsApp com base nestes dados fictícios:

📊 DADOS:
- Membros ativos: 15
- Mensagens hoje: 47
- Tópicos principais: futebol, trabalho, memes, reclamações
- Última briga: há 3 dias
- Membros novos esta semana: 2

Determine o humor predominante do grupo (feliz, estressado, animado, cansado, etc) e dê:
1. Uma frase descrevendo o clima
2. Uma sugestão para melhorar o humor (se necessário)
3. Um emoji representativo

Responda em Português-BR, de forma bem-humorada. Use emojis.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu analisar. Tente novamente.');
      }

      return reply(`🎭 *Análise de Humor do Grupo*\n\n${resposta}`);
    } catch (err) {
      console.error('[humor] Erro:', err.message);
      return reply('⚠️ Erro ao analisar humor. Tente novamente mais tarde.');
    }
  }
};
