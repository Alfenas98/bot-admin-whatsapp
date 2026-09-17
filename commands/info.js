const axios = require('axios');

module.exports = {
  name: 'info',
  aliases: ['pesquisa', 'buscar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const pergunta = args.join(' ');
    
    if (!pergunta) {
      return reply('⚠️ Use: #info <pergunta>\n\nExemplos:\n#info placar Corinthians\n#info cotação dólar\n#info notícias Brasil\n#info clima São Paulo');
    }

    try {
      // 1. Tentar buscar dados em tempo real baseados na pergunta
      let dados = '';
      const perguntaLower = pergunta.toLowerCase();
      
      // Clima
      if (perguntaLower.includes('clima') || perguntaLower.includes('tempo') || perguntaLower.includes('temperatura')) {
        const cidade = pergunta.replace(/clima|tempo|temperatura|em|de/gi, '').trim();
        if (cidade) {
          const coordsCache = {
            'são paulo': { lat: -23.5505, lon: -46.6333 },
            'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
            'belo horizonte': { lat: -19.9167, lon: -43.9345 },
            'curitiba': { lat: -25.4284, lon: -49.2733 },
            'brasília': { lat: -15.7975, lon: -47.8919 }
          };
          const coords = coordsCache[cidade.toLowerCase()];
          if (coords) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=America%2FSao_Paulo`;
            const res = await axios.get(url, { timeout: 10000 });
            if (res.data?.current_weather) {
              const atual = res.data.current_weather;
              dados = `Clima em ${cidade}: ${atual.temperature}°C, Vento: ${atual.windspeed} km/h`;
            }
          }
        }
      }
      
      // Cotação
      if (perguntaLower.includes('cotação') || perguntaLower.includes('dólar') || perguntaLower.includes('euro') || perguntaLower.includes('bitcoin')) {
        const moeda = perguntaLower.includes('euro') ? 'EUR' : 
                     perguntaLower.includes('bitcoin') || perguntaLower.includes('btc') ? 'BTC' : 'USD';
        const url = `https://economia.awesomeapi.com.br/json/last/${moeda}-BRL`;
        const res = await axios.get(url, { timeout: 10000 });
        const par = res.data[Object.keys(res.data)[0]];
        if (par) {
          dados = `Cotação ${moeda}/BRL: R$ ${parseFloat(par.bid).toFixed(2)} (${parseFloat(par.pChange).toFixed(2)}%)`;
        }
      }
      
      // Notícias
      if (perguntaLower.includes('notícia') || perguntaLower.includes('noticia') || perguntaLower.includes('jornal')) {
        const tema = pergunta.replace(/notícias|noticias|noticia|de|sobre|as|últimas/gi, '').trim() || 'brasil';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(tema)}&hl=pt-BR&gl=BR`;
        const res = await axios.get(rssUrl, { timeout: 10000 });
        const items = res.data?.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        let noticias = [];
        items.slice(0, 3).forEach(item => {
          const title = item.match(/<title>(.*?)<\/title>/)?.[1];
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
          if (title && title !== 'Google News') {
            noticias.push(title);
          }
        });
        
        if (noticias.length > 0) {
          dados = `Últimas notícias sobre "${tema}":\n${noticias.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
        }
      }

      // 2. Se encontrou dados, enviar
      if (dados) {
        await sock.sendMessage(groupId, {
          text: `📡 *Informação em Tempo Real*\n\n${dados}\n\n_Pergunte outra coisa com #info_`
        });
        return;
      }

      // 3. Se não encontrou dados específicos, informar
      await sock.sendMessage(groupId, {
        text: `⚠️ Não encontrei dados em tempo real para "${pergunta}".\n\nTente:\n#info clima São Paulo\n#info cotação dólar\n#info notícias Brasil\n\nOu use:\n#clima São Paulo\n#cotacao USD\n#placar Corinthians`
      });

    } catch (err) {
      console.error('[info] Erro:', err.message);
      await sock.sendMessage(groupId, {
        text: `⚠️ Erro ao buscar informações. Tente:\n#clima São Paulo\n#cotacao USD\n#placar Corinthians`
      });
    }
  }
};
