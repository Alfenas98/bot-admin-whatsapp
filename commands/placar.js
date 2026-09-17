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
      return reply('⚠️ Use: #placar <time>\nExemplo:\n#placar Corinthians\n#placar Flamengo\n#placar Palmeiras');
    }

    try {
      // Buscar jogos ao vivo (API Futebol Brasil)
      const url = `${BASE_URL}/ao-vivo`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const jogosAoVivo = res.data || [];
      
      // Filtrar jogos do time pesquisado (busca por nome popular ou slug)
      const timeLower = time.toLowerCase();
      const jogosFiltrados = jogosAoVivo.filter(jogo => {
        const casa = (jogo.time_mandante?.nome_popular || '').toLowerCase();
        const fora = (jogo.time_visitante?.nome_popular || '').toLowerCase();
        const slugCasa = (jogo.time_mandante?.slug || '').toLowerCase();
        const slugFora = (jogo.time_visitante?.slug || '').toLowerCase();
        return casa.includes(timeLower) || fora.includes(timeLower) ||
               slugCasa.includes(timeLower) || slugFora.includes(timeLower);
      });
      
      // Se encontrou jogo ao vivo
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
      
      // Se não tem ao vivo, buscar próximos jogos
      const urlProximos = `${BASE_URL}/campeonatos/10/jogos`;
      const resProximos = await axios.get(urlProximos, {
        timeout: 15000,
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      
      const proximos = (resProximos.data || []).filter(jogo => {
        const casa = (jogo.time_mandante?.nome_popular || '').toLowerCase();
        const fora = (jogo.time_visitante?.nome_popular || '').toLowerCase();
        return casa.includes(timeLower) || fora.includes(timeLower);
      }).slice(0, 3);
      
      if (proximos.length > 0) {
        let texto = `📅 *Próximos Jogos*\n\n`;
        
        proximos.forEach(jogo => {
          const timeCasa = jogo.time_mandante?.nome_popular || 'Casa';
          const timeFora = jogo.time_visitante?.nome_popular || 'Fora';
          const data = jogo.data_realizacao 
            ? new Date(jogo.data_realizacao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : 'Data a definir';
          
          texto += `🏟️ ${timeCasa} vs ${timeFora}\n`;
          texto += `📅 ${data}\n\n`;
        });
        
        return await sock.sendMessage(groupId, { text: texto });
      }
      
      // Fallback: usar Gemini
      const prompt = `Busque na internet o placar mais recente do time "${time}". 

Formato da resposta:
⚽ [Time Casa] [Placar] x [Placar] [Time Fora]
📅 [Data/Hora]
🏆 [Campeonato]
📊 [Status]

Se não encontrar, responda: "Não encontrei jogos recentes para [time]."

Responda em Português-BR.`;

      const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const resGemini = await axios.post(urlGemini, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = resGemini.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta || resposta.includes('Não encontrei')) {
        return reply(`⚠️ Não encontrei placar recente para "${time}".\n\nO time pode não ter jogos agora.`);
      }

      return await sock.sendMessage(groupId, { text: `📡 *Placar - ${time}*\n\n${resposta}` });
      
    } catch (err) {
      console.error('[placar] Erro:', err.message);
      return reply('⚠️ Erro ao buscar placar. Tente novamente mais tarde.');
    }
  }
};
