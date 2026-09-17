const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp', 'music');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function limparAntigos() {
  try {
    const agora = Date.now();
    const arquivos = fs.readdirSync(DOWNLOAD_DIR);
    arquivos.forEach(arq => {
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

async function buscarYTApi(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
  if (!YOUTUBE_API_KEY) return null;
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
    const res = await axios.get(url, { timeout: 10000 });
    
    if (res.data?.items?.length > 0) {
      for (const item of res.data.items) {
        const videoId = item.id.videoId;
        const titulo = item.snippet.title;
        
        let duracaoMs = 0;
        try {
          const urlDet = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const resDet = await axios.get(urlDet, { timeout: 10000 });
          if (resDet.data?.items?.[0]) {
            duracaoMs = parseDuration(resDet.data.items[0].contentDetails.duration);
          }
        } catch (e) {}
        
        if (duracaoMs < 8 * 60 * 1000) {
          return { videoId, titulo, duracaoMs };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro YT API:', e.message);
  }
  return null;
}

async function buscarYTScrape(query) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const match = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match) {
      const videoId = match[1];
      const titleMatch = res.data.match(/"title":{"runs":\[{"text":"([^"]+)"/);
      return { videoId, titulo: titleMatch ? titleMatch[1] : query, duracaoMs: 0 };
    }
  } catch (e) {}
  return null;
}

async function baixarYT(urlVideo, caminhoSaida) {
  try {
    const ytdl = require('@distube/ytdl-core');
    
    const info = await ytdl.getInfo(urlVideo);
    
    // Filtrar formatos de áudio válidos (não HLS, não live)
    const formatos = info.formats.filter(f => {
      return f.hasAudio && !f.hasVideo && 
             !f.url.includes('hls') && 
             !info.videoDetails.isLiveContent &&
             f.contentLength && parseInt(f.contentLength) < 15 * 1024 * 1024;
    });
    
    if (formatos.length === 0) {
      // Se não formato válido, tentar direto
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
    
    // Melhor formato de áudio
    const melhor = formatos.sort((a, b) => {
      const aSize = parseInt(a.contentLength || 0);
      const bSize = parseInt(b.contentLength || 0);
      return bSize - aSize;
    })[0];
    
    if (!melhor?.url) throw new Error('Sem URL válida');
    
    // Download direto via axios
    const response = await axios.get(melhor.url, {
      responseType: 'stream',
      timeout: 60000
    });
    
    const writer = fs.createWriteStream(caminhoSaida);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
  } catch (e) {
    throw e;
  }
}

async function buscarDeezer(query) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=3`;
    const res = await axios.get(url, { timeout: 10000 });
    
    if (res.data?.data?.length > 0) {
      for (const track of res.data.data) {
        if (track.preview) {
          return {
            id: track.id,
            titulo: track.title,
            artista: track.artist.name,
            preview: track.preview,
            link: track.link,
            source: 'deezer'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Deezer:', e.message);
  }
  return null;
}

async function baixarDeezer(url, caminhoSaida) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000
  });
  
  const writer = fs.createWriteStream(caminhoSaida);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports = {
  name: 'musica',
  aliases: ['music', 'song', 'tocar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const query = args.join(' ');
    
    if (!query) {
      return reply('⚠️ Use: #musica <nome da música>\nExemplo:\n#musica Asa - Bebê');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando...');

      // 1. Buscar no YouTube
      let resultado = await buscarYTApi(query) || await buscarYTScrape(query);
      
      if (!resultado) {
        return reply(`⚠️ Não encontrei "${query}"`);
      }

      const { videoId, titulo, duracaoMs } = resultado;

      if (duracaoMs > 8 * 60 * 1000) {
        return reply('⚠️ Música muito longa! Máx. 8 minutos.');
      }

      await reply(`🎵 ${titulo}\n⏳ Baixando...`);

      const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;
      
      // 2. Tentar baixar do YouTube (música completa)
      let sucesso = false;
      let erro = null;
      
      for (let i = 0; i < 3 && !sucesso; i++) {
        try {
          await baixarYT(urlVideo, caminhoArquivo);
          sucesso = true;
        } catch (e) {
          erro = e;
          console.log(`[musica] Tentativa ${i+1} falhou:`, e.message);
          
          if (e.message?.includes('429') || e.statusCode === 429) {
            await reply(`⚠️ Tentativa ${i+1}/3 - YouTube limitou. Aguardando...`);
            await delay(15000 * (i + 1));
          } else if (e.message?.includes('too_large')) {
            break;
          }
        }
      }
      
      // 3. Verificar se o arquivo é válido (não é o preview de 30s)
      if (sucesso && fs.existsSync(caminhoArquivo)) {
        const stats = fs.statSync(caminhoArquivo);
        
        // Se o arquivo é muito pequeno (menos de 50KB), provavelmente é só o preview
        if (stats.size < 50000 && duracaoMs > 60000) {
          sucesso = false;
          erro = new Error('Arquivo muito pequeno');
        }
      }
      
      // 4. Fallback: Deezer se YouTube falhar
      if (!sucesso) {
        console.log('[musica] YouTube falhou, tentando Deezer');
        
        const deezer = await buscarDeezer(query);
        
        if (deezer?.preview) {
          await reply(`🎵 Deezer: ${deezer.titulo}\n⏳ Enviando...`);
          
          try {
            await baixarDeezer(deezer.preview, caminhoArquivo);
            
            if (fs.existsSync(caminhoArquivo) && fs.statSync(caminhoArquivo).size > 1000) {
              await sock.sendMessage(groupId, {
                audio: fs.readFileSync(caminhoArquivo),
                mimetype: 'audio/mpeg',
                fileName: `${deezer.titulo}.mp3`,
                ptt: false
              }, { quoted: msg });
              
              try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
              return;
            }
          } catch (e) {
            console.log('[musica] Deezer falhou:', e.message);
          }
        }
        
        // 5. Enviar link como último recurso
        if (deezer) {
          return reply(`🎵 *${deezer.titulo}*\n🔗 Ouça: ${deezer.link}\n\n_⚠️ Download indisponível_`);
        }
        
        if (erro?.message?.includes('429') || erro?.statusCode === 429) {
          return reply('⚠️ YouTube limitou. Tente em 5-10 min.');
        }
        
        return reply('⚠️ Erro ao baixar. Tente outro termo.');
      }

      // Enviar música do YouTube
      let arquivoFinal = caminhoArquivo;
      if (!fs.existsSync(caminhoArquivo)) {
        const arquivos = fs.readdirSync(DOWNLOAD_DIR);
        const mp3 = arquivos.find(f => f.endsWith('.mp3'));
        if (mp3) arquivoFinal = path.join(DOWNLOAD_DIR, mp3);
      }

      if (!fs.existsSync(arquivoFinal)) {
        return reply('⚠️ Erro ao processar áudio.');
      }

      const stats = fs.statSync(arquivoFinal);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(arquivoFinal);
        return reply('⚠️ Áudio muito grande!');
      }

      if (stats.size < 5000) {
        fs.unlinkSync(arquivoFinal);
        return reply('⚠️ Download falhou. Tente novamente.');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(arquivoFinal),
        mimetype: 'audio/mpeg',
        fileName: `${titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(arquivoFinal); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      return reply('⚠️ Erro. Tente novamente.');
    }
  }
};

function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600 + parseInt(match[2] || 0) * 60 + parseInt(match[3] || 0)) * 1000;
}
