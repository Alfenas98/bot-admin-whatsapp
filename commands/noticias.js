const axios = require('axios');

// Busca notícias em tempo real
module.exports = {
  name: 'noticias',
  aliases: ['news', 'notícia'],
  adminOnly: false,

  async execute({ sock, groupId, args, reply }) {
    const tema = args.join(' ') || 'brasil';
    
    try {
      // Buscar notícias via API gratuita
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(tema)}&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY || ''}`;
      
      let noticias = [];
      
      if (process.env.NEWS_API_KEY) {
        const res = await axios.get(url, { timeout: 10000 });
        if (res.data?.articles) {
          noticias = res.data.articles;
        }
      }
      
      // Fallback: usar RSS do Google News
      if (noticias.length === 0) {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(tema)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const res = await axios.get(rssUrl, { timeout: 10000 });
        
        // Parsear RSS básico
        const items = res.data?.match(/<item>([\s\S]*?)<\/item>/g) || [];
        items.slice(0, 5).forEach(item => {
          const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
          
          if (title && title !== 'Google News') {
            noticias.push({
              title,
              url: link,
              publishedAt: pubDate,
              source: { name: 'Google News' }
            });
          }
        });
      }
      
      if (noticias.length === 0) {
        return reply(`⚠️ Nenhuma notícia encontrada sobre "${tema}".`);
      }
      
      let texto = `📰 *Últimas Notícias sobre "${tema}"*\n\n`;
      
      noticias.forEach((noticia, i) => {
        const data = noticia.publishedAt 
          ? new Date(noticia.publishedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : '';
        
        texto += `${i + 1}. *${noticia.title}*\n`;
        if (noticia.source?.name) texto += `   📌 ${noticia.source.name}`;
        if (data) texto += ` | 📅 ${data}`;
        texto += '\n\n';
      });
      
      return await sock.sendMessage(groupId, { text: texto.trim() });
    } catch (err) {
      console.error('[noticias] Erro:', err.message);
      return reply('⚠️ Erro ao buscar notícias. Tente novamente mais tarde.');
    }
  }
};
