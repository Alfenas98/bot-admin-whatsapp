const axios = require('axios');

const API_KEY = 'live_af0a792064fd6119fc17a4aece26cc';
const BASE_URL = 'https://api.api-futebol.com.br/v1';

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
      // 1. Tentar API Futebol (apenas /ao-vivo funciona no plano gratuito)
      try {
        const url = `${BASE_URL}/ao-vivo`;
        const res = await axios.get(url, {
          timeout: 10000,
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        const jogosAoVivo = res.data || [];
        const timeLower = time.toLowerCase();
        
        // Filtrar jogos do time
        const jogosFiltrados = jogosAoVivo.filter(jogo => {
          const casa = (jogo.time_mandante?.nome_popular || '').toLowerCase();
          const fora = (jogo.time_visitante?.nome_popular || '').toLowerCase();
          return casa.includes(timeLower) || fora.includes(timeLower);
        });
        
        if (jogosFiltrados.length > 0) {
          let texto = `⚽ *Placar ao Vivo*\n\n`;
          jogosFiltrados.forEach(jogo => {
            const timeCasa = jogo.time_mandante?.nome_popular || 'Casa';
            const timeFora = jogo.time_visitante?.nome_popular || 'Fora';
            const placarCasa = jogo.placar_mandante ?? 0;
            const placarFora = jogo.placar_visitante ?? 0;
            const status = jogo.status || 'Em andamento';
            const estadio = jogo.estadio?.nome || '';
            
            texto += `🏟️ ${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}\n`;
            texto += `📍 ${estadio}\n`;
            texto += `📊 ${status}\n\n`;
          });
          return await sock.sendMessage(groupId, { text: texto });
        }
      } catch (err) {
        console.log('[placar] API Futebol indisponível, usando Gemini');
      }

      // 2. Fallback: usar Gemini
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

Responda APENAS com as informações do placar, sem textos adicionais. Em Português-BR.`;

      const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const resGemini = await axios.post(urlGemini, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = resGemini.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
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
