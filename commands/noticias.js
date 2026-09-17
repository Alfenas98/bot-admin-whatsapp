const axios = require('axios');

module.exports = {
  name: 'noticias',
  aliases: ['news', 'notícia'],
  adminOnly: false,

  async execute({ sock, groupId, args, reply }) {
    const tema = args.join(' ') || 'brasil';
    
    try {
      const prompt = `Busque na internet as últimas notícias sobre "${tema}".

Procure por:
- Notícias recentes (últimas 24h)
- Fontes confiáveis
- Títulos e resumos

Formato da resposta:
📰 [Título da notícia]
📌 [Fonte] | 📅 [Data]
[Resumo breve]

Liste as 5 notícias mais recentes.

Responda em Português-BR.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply(`⚠️ Não encontrei notícias sobre "${tema}".`);
      }

      return await sock.sendMessage(groupId, {
        text: `📰 *Últimas Notícias: ${tema}*\n\n${resposta}`
      });
    } catch (err) {
      console.error('[noticias] Erro:', err.message);
      return reply('⚠️ Erro ao buscar notícias. Tente novamente mais tarde.');
    }
  }
};
