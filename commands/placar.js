const axios = require('axios');

// Busca placar de futebol
module.exports = {
  name: 'placar',
  aliases: ['jogo', 'score'],
  adminOnly: false,

  async execute({ sock, groupId, args, reply }) {
    const time = args.join(' ');
    
    if (!time) {
      return reply('⚠️ Use: #placar <time>\nExemplo: #placar Corinthians\n#placar Palmeiras');
    }

    try {
      // Buscar na API do GloboEsporte (gratuita)
      const url = `https://api.globoesporte.globo.com/v1/partidas/busca?q=${encodeURIComponent(time)}`;
      const res = await axios.get(url, { timeout: 10000 });
      
      if (res.data && res.data.length > 0) {
        const partida = res.data[0];
        
        const timeCasa = partida.equipe_casa?.nome_popular || partida.equipe_casa?.nome || 'Time Casa';
        const timeFora = partida.equipe_visitante?.nome_popular || partida.equipe_visitante?.nome || 'Time Fora';
        const placarCasa = partida.placar_casa || 0;
        const placarFora = partida.placar_visitante || 0;
        const status = partida.status || 'Em andamento';
        const data = new Date(partida.data_realizacao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const estadio = partida.estadio?.nome || '';
        
        let texto = `⚽ *Placar em Tempo Real*\n\n`;
        texto += `${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}\n\n`;
        texto += `📅 ${data}\n`;
        texto += `🏟️ ${estadio}\n`;
        texto += `📊 Status: ${status}`;
        
        return await sock.sendMessage(groupId, { text: texto });
      } else {
        // Fallback: buscar informações do time
        const urlInfo = `https://api.sofapi.com/v1/teams/search?query=${encodeURIComponent(time)}`;
        const resInfo = await axios.get(urlInfo, { timeout: 10000 });
        
        if (resInfo.data && resInfo.data.length > 0) {
          const info = resInfo.data[0];
          return await sock.sendMessage(groupId, {
            text: `⚽ *${info.name}*\n\n🏆 ${info.league || 'Campeonato'}\n📍 ${info.country || 'Brasil'}`,
          });
        }
        
        return reply(`⚠️ Nenhum jogo encontrado para "${time}".\n\nVerifique o nome do time ou tente:\n#placar Corinthians\n#placar Flamengo`);
      }
    } catch (err) {
      // Fallback com dados simulados se a API falhar
      const jogos = {
        'corinthians': { casa: 'Corinthians', fora: 'Palmeiras', placarC: 1, placarF: 0, status: 'Em andamento' },
        'palmeiras': { casa: 'Palmeiras', fora: 'Corinthians', placarC: 0, placarF: 1, status: 'Em andamento' },
        'flamengo': { casa: 'Flamengo', fora: 'Vasco', placarC: 2, placarF: 1, status: 'Encerrado' },
        'são paulo': { casa: 'São Paulo', fora: 'Santos', placarC: 0, placarF: 0, status: 'Em breve' }
      };
      
      const jogo = jogos[time.toLowerCase()];
      if (jogo) {
        let texto = `⚽ *Placar em Tempo Real*\n\n`;
        texto += `${jogo.casa} ${jogo.placarC} x ${jogo.placarF} ${jogo.fora}\n\n`;
        texto += `📊 Status: ${jogo.status}\n\n`;
        texto += `_⚠️ Dados simulados (API indisponível)_`;
        
        return await sock.sendMessage(groupId, { text: texto });
      }
      
      console.error('[placar] Erro:', err.message);
      return reply('⚠️ Erro ao buscar placar. Tente novamente mais tarde.');
    }
  }
};
