const axios = require('axios');
const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'sugestiao',
  aliases: ['sugestao', 'ideias', 'suggest'],
  adminOnly: true,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      const config = getGroupConfig(groupId);
      const membros = config.membros || [];
      const totalMembros = membros.length;

      const prompt = `Crie 5 sugestões de enquetes criativas para um grupo WhatsApp com ${totalMembros} membros.

As enquetes devem ser:
- Divertidas e engajadoras
- Fáceis de votar
- Variadas (futebol, comida, filmes, vida pessoal, etc)

Responda em Português-BR com formato:
1. Pergunta?
   • Opção A
   • Opção B
   • Opção C
...

Use emojis. Seja criativo!`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu gerar sugestões. Tente novamente.');
      }

      return reply(`💡 *Sugestões de Enquetes*\n\n${resposta}`);
    } catch (err) {
      console.error('[sugestiao] Erro:', err.message);
      return reply('⚠️ Erro ao gerar sugestões. Tente novamente mais tarde.');
    }
  }
};
