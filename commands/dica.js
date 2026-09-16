const axios = require('axios');

module.exports = {
  name: 'dica',
  aliases: ['tip', 'dica', 'sabia'],
  adminOnly: false,

  async execute({ reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    const temas = ['produtividade', 'relacionamentos', 'tecnologia', 'saúde', 'finanças', 'estudo', 'programação', 'culinária'];
    const tema = temas[Math.floor(Math.random() * temas.length)];

    try {
      const prompt = `Dê uma dica rápida e útil sobre "${tema}".

A dica deve ser:
- Curta (2-3 linhas)
- Prática
- Em Português-BR
- Final com emoji`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu gerar uma dica. Tente novamente.');
      }

      return reply(`🧠 *Dica do Dia (${tema})*\n\n${resposta}`);
    } catch (err) {
      console.error('[dica] Erro:', err.message);
      return reply('⚠️ Erro ao gerar dica. Tente novamente mais tarde.');
    }
  }
};
