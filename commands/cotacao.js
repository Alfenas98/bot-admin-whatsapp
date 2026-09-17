const axios = require('axios');

module.exports = {
  name: 'cotacao',
  aliases: ['cotacoes', 'cambio', 'dolar', 'euro'],
  adminOnly: false,

  async execute({ reply, args }) {
    const moeda = args[0] || 'USD';
    
    try {
      const prompt = `Busque na internet a cotação mais recente para: "${moeda}/BRL".

Procure por:
- Cotação atual
- Variação percentual
- Máxima e mínima do dia
- Fonte confiável (banco, trading, etc)

Formato da resposta:
💱 [Moeda]/BRL: R$ [valor]
📈 Variação: [X]%
📊 Máxima: R$ [valor] | Mínima: R$ [valor]
📅 [Data/hora da consulta]

Responda APENAS com as informações de cotação. Em Português-BR.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply(`⚠️ Não foi possível obter a cotação de "${moeda}".`);
      }

      return reply(`📡 *Cotação ${moeda}/BRL*\n\n${resposta}`);
    } catch (err) {
      console.error('[cotacao] Erro:', err.message);
      return reply('⚠️ Erro ao obter cotação. Tente novamente mais tarde.');
    }
  }
};
