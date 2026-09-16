const axios = require('axios');

module.exports = {
  name: 'conselho',
  aliases: ['ajuda', 'tip'],
  adminOnly: false,

  async execute({ msg, reply, args }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    const contexto = args.join(' ') || 'conselho geral para o grupo';
    
    try {
      const prompt = `Dê um conselho amigável e útil sobre: "${contexto}"

O conselho deve ser:
- Prático e fácil de seguir
- Em tom amigável (não arrogante)
- Curto (2-3 frases máximo)
- Em Português-BR
- Com emoji no final`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu gerar um conselho. Tente novamente.');
      }

      return reply(`💡 *Conselho*\n\n${resposta}`);
    } catch (err) {
      console.error('[conselho] Erro:', err.message);
      return reply('⚠️ Erro ao gerar conselho. Tente novamente mais tarde.');
    }
  }
};
