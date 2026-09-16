const axios = require('axios');

module.exports = {
  name: 'piada',
  aliases: ['joke', 'risada'],
  adminOnly: false,

  async execute({ reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      const prompt = `Conte uma piada curta e engraçada sobre tecnologia, WhatsApp ou programação.

Deve ser:
- Curta (3-5 linhas)
- Bem-humorada
- Sem ofensas
- Em Português-BR

Use emojis no final para dar o tom.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu contar uma piada. Tente novamente.');
      }

      return reply(`😂 *Hora da Piada*\n\n${resposta}`);
    } catch (err) {
      console.error('[piada] Erro:', err.message);
      return reply('⚠️ Erro ao contar piada. Tente novamente mais tarde.');
    }
  }
};
