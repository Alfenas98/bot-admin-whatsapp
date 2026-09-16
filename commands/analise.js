const axios = require('axios');
const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'analise',
  aliases: ['analisar', 'diagnostico'],
  adminOnly: true,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      const config = getGroupConfig(groupId);
      const membros = config.membros || [];
      const totalEntradas = membros.filter(m => m.acao === 'add').length;
      const totalSaidas = membros.filter(m => m.acao === 'remove').length;
      const retencao = totalEntradas > 0 
        ? Math.round(((totalEntradas - totalSaidas) / totalEntradas) * 100)
        : 0;

      const prompt = `Faça um diagnóstico rápido deste grupo WhatsApp:

📊 DADOS:
- Entradas: ${totalEntradas}
- Saídas: ${totalSaidas}
- Taxa de retenção: ${retencao}%
- Histórico: ${membros.length} registros

Forneça:
1. Saúde do grupo (ótima/boa/ruim)
2. Uma observação sobre a retenção
3. Sugestão de melhoria

Responda em Português-BR, breve e direto. Use emojis.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu analisar. Tente novamente.');
      }

      return reply(`🔍 *Diagnóstico do Grupo*\n\n${resposta}`);
    } catch (err) {
      console.error('[analise] Erro:', err.message);
      return reply('⚠️ Erro ao analisar grupo. Tente novamente mais tarde.');
    }
  }
};
