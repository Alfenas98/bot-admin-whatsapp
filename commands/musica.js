const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp', 'music');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function limparAntigos() {
  try {
    const agora = Date.now();
    fs.readdirSync(DOWNLOAD_DIR).forEach(arq => {
      const caminho = path.join(DOWNLOAD_DIR, arq);
      const stat = fs.statSync(caminho);
      if (agora - stat.mtimeMs > 15 * 60 * 1000) try { fs.unlinkSync(caminho); } catch (e) {}
    });
  } catch (e) {}
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarYouTube(query) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }
    });
    
    const html = res.data;
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/g);
    
    if (videoIdMatch && videoIdMatch.length > 0) {
      const ids = new Set();
      for (const m of videoIdMatch) {
        const id = m.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
        if (id) ids.add(id);
      }
      
      const titulos = [];
      for (const t of titleMatch) {
        const tit = t.match(/"title":{"runs":\[{"text":"([^"]+)"/)?.[1];
        if (tit) titulos.push(tit);
      }
      
      const videoIds = Array.from(ids);
      if (videoIds.length > 0) {
        return {
          videoId: videoIds[0],
          titulo: titulos[0] || query
        };
      }
    }
  } catch (e) {
    console.log('[musica] Erro busca YouTube:', e.message);
  }
  return null;
}

async function baixarYTDL(urlVideo, caminhoSaida) {
  const ytdl = require('@distube/ytdl-core');
  
  // Tentar com proxy se disponível
  const proxyUrl = process.env.YOUTUBE_PROXY || '';
  
  const options = {
    quality: 'highestaudio',
    filter: 'audioonly',
    highWaterMark: 1 << 25,
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  };
  
  // Se tiver proxy, adicionar
  if (proxyUrl) {
    options.requestOptions.agent = new (require('https').Agent)({
      rejectUnauthorized: false
    });
  }
  
  const info = await ytdl.getInfo(urlVideo, options);
  
  // Filtrar formatos de áudio válidos
  const formatos = info.formats.filter(f => 
    f.hasAudio && !f.hasVideo && 
    f.contentLength && parseInt(f.contentLength) < 15 * 1024 * 1024 &&
    !info.videoDetails.isLiveContent
  );
  
  if (formatos.length === 0) {
    // Stream direto
    const stream = ytdl(urlVideo, options);
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
  
  const melhor = formatos.sort((a, b) => 
    parseInt(b.contentLength || 0) - parseInt(a.contentLength || 0)
  )[0];
  
  const response = await axios.get(melhor.url, {
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
      return reply('🎵 Use: #musica <nome da música>\nExemplo:\n#musica Asa - Bebê');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando...');

      const video = await buscarYouTube(query);
      
      if (!video) {
        return reply(`⚠️ Não encontrei "${query}"`);
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
      return reply('⚠️ Erro ao baixar música.');
    }
  }
};
