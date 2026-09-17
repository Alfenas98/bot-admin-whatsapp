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

// Buscar vídeo via YouTube Data API
async function buscarVideoId(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
  if (!YOUTUBE_API_KEY) return null;
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.items?.length > 0) {
      for (const item of res.data.items) {
        let duracaoMs = 0;
        try {
          const urlDet = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${item.id.videoId}&key=${YOUTUBE_API_KEY}`;
          const resDet = await axios.get(urlDet, { timeout: 15000 });
          if (resDet.data?.items?.[0]) {
            const dur = resDet.data.items[0].contentDetails.duration;
            const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
              duracaoMs = (parseInt(match[1] || 0) * 3600 + parseInt(match[2] || 0) * 60 + parseInt(match[3] || 0)) * 1000;
            }
          }
        } catch (e) {}
        
        if (duracaoMs < 10 * 60 * 1000) {
          return {
            videoId: item.id.videoId,
            titulo: item.snippet.title,
            duracaoMs
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro busca YT:', e.message);
  }
  return null;
}

// Buscar no Invidious (alternativa ao YouTube sem rate limit)
async function buscarInvidious(query) {
  const instancias = [
    'https://yewtu.be',
    'https://invidious.nerdvpn.de',
    'https://inv.nadeko.net',
    'https://invidious.jing.rocks'
  ];
  
  for (const inst of instancias) {
    try {
      const url = `${inst}/api/v1/search?q=${encodeURIComponent(search)}&type=video&sort=relevance`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (res.data?.length > 0) {
        for (const video of res.data) {
          if (video.lengthSeconds && video.lengthSeconds < 600 && video.videoId) {
            return {
              videoId: video.videoId,
              titulo: video.title,
              duracaoMs: video.lengthSeconds * 1000,
              source: inst
            };
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Baixar via Invidious (sem rate limit)
async function baixarInvidious(videoId, instancia, caminhoSaida) {
  // Obter links de download do Invidious
  const infoUrl = `${instancia}/api/v1/videos/${videoId}`;
  const info = await axios.get(infoUrl, { timeout: 30000 });
  
  if (info.data?.adaptiveFormats) {
    const audio = info.data.adaptiveFormats
      .filter(f => f.type?.startsWith('audio/') && !f.type.includes('opus'))
      .sort((a, b) => (parseInt(b.bitrate || 0) || 0) - (parseInt(a.bitrate || 0) || 0))[0];
    
    if (audio?.url) {
      const response = await axios.get(audio.url, {
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
  }
  
  throw new Error('Sem formato de áudio disponível');
}

// Baixar via ytdl-core
async function baixarYTDL(urlVideo, caminhoSaida) {
  const ytdl = require('@distube/ytdl-core');
  
  const info = await ytdl.getInfo(urlVideo);
  
  const formatos = info.formats.filter(f => 
    f.hasAudio && !f.hasVideo && 
    f.contentLength && parseInt(f.contentLength) < 15 * 1024 * 1024 &&
    !info.videoDetails.isLiveContent
  );
  
  if (formatos.length === 0) {
    // Fallback para stream
    const stream = ytdl(urlVideo, {
      quality: 'lowestaudio',
      filter: 'audioonly'
    });
    
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
      return reply('🎵 Use: #musica <nome da música>');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      // 1. Buscar vídeo
      let video = await buscarVideoId(query);
      
      if (!video) {
        return reply(`⚠️ Não encontrei "${query}"`);
      }

      await reply(`🎵 ${video.titulo}\n⏳ Baixando...`);

      const urlVideo = `https://www.youtube.com/watch?v=${video.videoId}`;
      
      // 2. Tentar Invidious primeiro (sem rate limit)
      let sucesso = false;
      let erro = null;
      
      try {
        // Buscar dados do vídeo no Invidious
        const instancias = [
          'https://yewtu.be',
          'https://invidious.nerdvpn.de',
          'https://inv.nadeko.net'
        ];
        
        for (const inst of instancias) {
          try {
            await baixarInvidious(video.videoId, inst, caminhoArquivo);
            sucesso = true;
            break;
          } catch (e) {
            console.log(`[musica] Invidious ${inst} falhou`);
            continue;
          }
        }
      } catch (e) {
        erro = e;
      }
      
      // 3. Fallback: ytdl-core
      if (!sucesso) {
        for (let i = 0; i < 3 && !sucesso; i++) {
          try {
            await baixarYTDL(urlVideo, caminhoArquivo);
            sucesso = true;
          } catch (e) {
            erro = e;
            console.log(`[musica] ytdl tentativa ${i+1} falhou:`, e.message);
            
            if (e.message?.includes('429') || e.statusCode === 429) {
              if (i < 2) await delay(15000 * (i + 1));
            } else {
              break;
            }
          }
        }
      }
      
      if (!sucesso) {
        // 4. Fallback final: Deezer preview
        try {
          const deezer = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`, {
            timeout: 15000
          });
          
          if (deezer.data?.data?.[0]?.preview) {
            await reply(`🎵 Enviando preview (30s) via Deezer...`);
            
            const response = await axios.get(deezer.data.data[0].preview, {
              responseType: 'stream',
              timeout: 30000
            });
            
            const writer = fs.createWriteStream(caminhoArquivo);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            if (fs.existsSync(caminhoArquivo) && fs.statSync(caminhoArquivo).size > 1000) {
              await sock.sendMessage(groupId, {
                audio: fs.readFileSync(caminhoArquivo),
                mimetype: 'audio/mpeg',
                fileName: `${deezer.data.data[0].title}.mp3`,
                ptt: false
              }, { quoted: msg });
              
              try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
              return;
            }
          }
        } catch (e) {}
        
        if (erro?.message?.includes('429') || erro?.statusCode === 429) {
          return reply('⚠️ YouTube limitou. Tente em 5-10 min.');
        }
        
        return reply('⚠️ Não foi possível baixar. Tente outro termo.');
      }

      // Validar e enviar
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
