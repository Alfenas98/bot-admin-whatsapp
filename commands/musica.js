const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp', 'music');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function limparAntigos() {
  try {
    const agora = Date.now();
    fs.readdirSync(DOWNLOAD_DIR).forEach(arq => {
      const caminho = path.join(DOWNLOAD_DIR, arq);
      const stat = fs.statSync(caminho);
      if (agora - stat.mtimeMs > 15 * 60 * 1000) {
        try { fs.unlinkSync(caminho); } catch (e) {}
      }
    });
  } catch (e) {}
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim();
}

async function buscarYouTube(query) {
  // Gerar variações da busca
  const variacoes = [
    query,
    normalizar(query),
    query.replace(/[^a-zA-Z0-9\s-]/g, ''),
    query.split('-')[0]?.trim(),
    query.split(' ').slice(0, 3).join(' '),
    query.split(' ').slice(0, 2).join(' ')
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  
  for (const termo of variacoes) {
    if (!termo || termo.length < 3) continue;
    
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        decompress: true
      });
      
      const html = res.data;
      
      // Múltiplos padrões para encontrar videoId
      const padroes = [
        /"videoId":"([a-zA-Z0-9_-]{11})"/g,
        /"videoId\\":\\"([a-zA-Z0-9_-]{11})\\/g,
        /watch\?v=([a-zA-Z0-9_-]{11})/g,
        /"videoId":"([a-zA-Z0-9_-]{11})"/g,
        /\\"videoId\\":\\"([a-zA-Z0-9_-]{11})\\/g
      ];
      
      const videoIds = new Set();
      
      for (const padrao of padroes) {
        let match;
        while ((match = padrao.exec(html)) !== null) {
          const vid = match[1];
          if (vid && vid.length === 11) {
            videoIds.add(vid);
          }
        }
      }
      
      // Buscar títulos
      const titulos = [];
      const titPadrao = /"title":{"runs":\[{"text":"([^"]+)"/g;
      let titMatch;
      while ((titMatch = titPadrao.exec(html)) !== null) {
        titulos.push(titMatch[1]);
      }
      
      if (videoIds.size > 0) {
        const ids = Array.from(videoIds);
        for (let i = 0; i < Math.min(ids.length, 5); i++) {
          return {
            videoId: ids[i],
            titulo: titulos[i] || termo
          };
        }
      }
      
      // Segundo padrão: buscar no JSON embutido
      const jsonMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (jsonMatch) {
        return {
          videoId: jsonMatch[1],
          titulo: termo
        };
      }
      
    } catch (e) {
      console.log(`[musica] Erro ao buscar "${termo}":`, e.message);
      continue;
    }
  }
  
  return null;
}

async function baixarYTDL(urlVideo, caminhoSaida) {
  const ytdl = require('@distube/ytdl-core');
  
  const info = await ytdl.getInfo(urlVideo);
  
  const formatos = info.formats.filter(f => 
    f.hasAudio && !f.hasVideo && 
    f.contentLength && parseInt(f.contentLength) < 15 * 1024 * 1024
  );
  
  let url;
  if (formatos.length > 0) {
    const melhor = formatos.sort((a, b) => 
      parseInt(b.contentLength || 0) - parseInt(a.contentLength || 0)
    )[0];
    url = melhor.url;
  } else {
    const stream = ytdl(urlVideo, { quality: 'lowestaudio', filter: 'audioonly' });
    const writeStream = fs.createWriteStream(caminhoSaida);
    let totalSize = 0;
    
    stream.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > 15 * 1024 * 1024) stream.destroy();
    });
    
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  }
  
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000
  });
  
  const writer = fs.createWriteStream(caminhoSaida);
  let totalSize = 0;
  
  response.data.on('data', (chunk) => {
    totalSize += chunk.length;
    if (totalSize > 16 * 1024 * 1024) {
      response.data.destroy();
      writer.destroy();
    }
  });
  
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

module.exports = {
  name: 'musica',
  aliases: ['music', 'song', 'tocar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const query = args.join(' ');
    
    if (!query) {
      return reply('🎵 Use: #musica <nome da música>');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando...');

      const video = await buscarYouTube(query);
      
      if (!video) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo ou verifique a ortografia.`);
      }

      await reply(`🎵 ${video.titulo}\n⏳ Baixando...`);

      const urlVideo = `https://www.youtube.com/watch?v=${video.videoId}`;
      
      let sucesso = false;
      let erro = null;
      
      for (let i = 0; i < 3 && !sucesso; i++) {
        try {
          await baixarYTDL(urlVideo, caminhoArquivo);
          sucesso = true;
        } catch (e) {
          erro = e;
          console.log(`[musica] Tentativa ${i+1}:`, e.message);
          
          if (e.message?.includes('429') || e.statusCode === 429) {
            if (i < 2) await delay(20000 * (i + 1));
          } else {
            break;
          }
        }
      }
      
      if (!sucesso) {
        return reply('⚠️ YouTube está limitando. Tente em 5-10 min.');
      }

      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao processar.');
      }

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Áudio muito grande!');
      }

      if (stats.size < 10000) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Download inválido.');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(caminhoArquivo),
        mimetype: 'audio/mpeg',
        fileName: `${video.titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      return reply('⚠️ Erro ao processar música.');
    }
  }
};
