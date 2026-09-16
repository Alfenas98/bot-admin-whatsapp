const axios = require('axios');
const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'historia',
  aliases: ['story', 'conto'],
  adminOnly: false,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      const config = getGroupConfig(groupId);
      const membros = config.membros || [];
      const nomesMembros = membros.slice(0, 5).map(m => m.nome || m.membroId.split('@')[0]).filter(Boolean);
      
      const prompt = `Crie uma história curta e engraçada (máximo 100 palavras) envolvendo estes membros de um grupo WhatsApp: ${nomesMembros.join(', ') || 'João, Maria, Carlos, Ana'}.

A história deve ser:
- Bem-humorada
- Sem ofender ninguém
- Criativa
- Em Português-BR

Use emojis.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu criar uma história. Tente novamente.');
      }

      return reply(`📖 *História do Grupo*\n\n${resposta}`);
    } catch (err) {
      console.error('[historia] Erro:', err.message);
      return reply('⚠️ Erro ao criar história. Tente novamente mais tarde.');
    }
  }
};
