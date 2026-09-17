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
        
        if (jogosAoVivo.length > 0) {
          const timeLower = time.toLowerCase();
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
              texto += `🏟️ ${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}\n`;
              texto += `📊 ${status}\n\n`;
            });
            return await sock.sendMessage(groupId, { text: texto });
          }
        }
      } catch (err) {
        console.log('[placar] API Futebol indisponível');
      }

      // 2. Fallback: usar Gemini com prompt mais específico
      const prompt = `Você é um assistente de futebol. O usuário quer saber o placar do time "${time}".

IMPORTANTE: O jogo do ${time} ESTÁ ACONTECENDO AGORA ou aconteceu recentemente.

Faça o seguinte:
1. Busque na internet o placar mais recente do time "${time}"
2. Se encontrar, retorne no formato:
   ⚽ [Time Casa] [Placar] x [Placar] [Time Fora]
   📅 [Data/Hora]
   🏆 [Campeonato]
   📊 [Status: ao vivo/encerrado]

3. Se NÃO encontrar, tente buscar por nomes alternativos do time (ex: "Corinthians" pode ser "Timão", "Flamengo" pode ser "Mengão")

4. Se ainda assim não encontrar, responda: "Não encontrei o placar do ${time}. O jogo pode não estar acontecendo agora."

Responda APENAS com as informações do placar. Em Português-BR.`;

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
