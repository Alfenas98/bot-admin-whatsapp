const axios = require('axios');

module.exports = {
  name: 'placar',
  aliases: ['jogo', 'score'],
  adminOnly: false,

  async execute({ sock, groupId, args, reply }) {
    const time = args.join(' ');
    
    if (!time) {
      return reply('⚠️ Use: #placar <time>\nExemplo:\n#placar Corinthians\n#placar Flamengo');
    }

    try {
      const prompt = `Busque na internet o placar mais recente do time "${time}". 
      
Procure por:
- Placar de jogos ao vivo ou recentes
- Campeonato e data
- Status do jogo (ao vivo, encerrado, etc)

Formato da resposta:
⚽ [Time Casa] [Placar] x [Placar] [Time Fora]
📅 [Data/Hora]
🏆 [Campeonato]
📊 [Status]

Se não encontrar informações recentes, responda: "Não encontrei jogos recentes para [time]. Tente novamente mais tarde."

Responda APENAS com as informações do placar, sem textos adicionais.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta || resposta.includes('Não encontrei')) {
        return reply(`⚠️ Não encontrei placar recente para "${time}".\n\nO jogo pode não estar acontecendo agora.`);
      }

      return await sock.sendMessage(groupId, { text: `📡 *Placar - ${time}*\n\n${resposta}` });
    } catch (err) {
      console.error('[placar] Erro:', err.message);
      return reply('⚠️ Erro ao buscar placar. Tente novamente mais tarde.');
    }
  }
};
