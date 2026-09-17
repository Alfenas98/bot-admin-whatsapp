const axios = require('axios');

module.exports = {
  name: 'info',
  aliases: ['pesquisa', 'buscar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const pergunta = args.join(' ');
    
    if (!pergunta) {
      return reply('⚠️ Use: #info <pesquisa>\n\nExemplos:\n#info placar Corinthians\n#info cotação dólar hoje\n#info notícias Brasil\n#info clima São Paulo\n#info preço Bitcoin\n#info filmes em cartaz\n#info qualquer coisa...');
    }

    try {
      const prompt = `Você é um assistente de pesquisas em tempo real. Busque na internet informações atualizadas sobre: "${pergunta}"

Responda de forma organizada e objetiva com emojis.
Se não encontrar informações atualizadas, informe claramente.

Formato sugerido:
📡 [Título/Resposta]
[Detalhes organizados]
📅 [Data/hora se relevante]

Responda em Português-BR.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply(`⚠️ Não foi possível obter informações sobre "${pergunta}".`);
      }

      return await sock.sendMessage(groupId, {
        text: `📡 *Pesquisa: ${pergunta}*\n\n${resposta}`
      });
    } catch (err) {
      console.error('[info] Erro:', err.message);
      return reply('⚠️ Erro ao pesquisar. Tente novamente mais tarde.');
    }
  }
};
