const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// ===================== PIPED API (sem rate limit) =====================
async function buscarPiped(query) {
  console.log('[musica] Buscando no Piped...');
  
  const instancias = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.r4fo.com',
    'https://pipedapi.phoenix.fun'
  ];
  
  for (const instancia of instancias) {
    try {
      const url = `${instancia}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (res.data?.items?.length > 0) {
        for (const video of res.data.items) {
          if (video.url && video.duration < 600) {
            const videoId = video.url.replace('/watch?v=', '');
            return {
              videoId,
              titulo: video.title,
              duracaoMs: video.duration * 1000,
              source: instancia
            };
          }
        }
      }
    } catch (e) {
      console.log(`[musica] Piped ${instancia} falhou:`, e.message);
      continue;
    }
  }
  
  return null;
}

// Baixar streams info do Piped
async function baixarPiped(videoId) {
  const instancias = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.r4fo.com'
  ];
  
  for (const instancia of instancias) {
    try {
      const url = `${instancia}/streams/${videoId}`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (res.data?.audioStreams?.length > 0) {
        // Buscar melhor stream de áudio
        const audioStreams = res.data.audioStreams
          .filter(s => s.format === 'M4A' || s.format === 'WEBMA' || s.format === 'MP3')
          .sort((a, b) => (parseInt(b.quality || 0) || 0) - (parseInt(a.quality || 0) || 0));
        
        if (audioStreams.length > 0) {
          return {
            url: audioStreams[0].url,
            filename: `${res.data.title}.m4a`,
            title: res.data.title,
            mimeType: audioStreams[0].mimeType || 'audio/m4a'
          };
        }
      }
      
      // Fallback: qualquer stream de áudio
      if (res.data?.audioStreams?.length > 0) {
        const stream = res.data.audioStreams[0];
        return {
          url: stream.url,
          filename: `${res.data.title}.m4a`,
          title: res.data.title,
          mimeType: stream.mimeType || 'audio/m4a'
        };
      }
    } catch (e) {
      console.log(`[musica] Piped streams ${instancia} falhou:`, e.message);
      continue;
    }
  }
  
  return null;
}

// ===================== YOUTUBE COM PROXY =====================
async function buscarYouTube(query) {
  console.log('[musica] Buscando no YouTube...');
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const videoIdMatch = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const titleMatch = res.data.match(/"title":{"runs":\[{"text":"([^"]+)"/g);
    
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
  
  const proxy = process.env.YOUTUBE_PROXY || '';
  
  const options = {
    quality: 'lowestaudio',
    filter: 'audioonly',
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  };
  
  if (proxy) {
    // Configurar agente de proxy
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      options.requestOptions.agent = new HttpsProxyAgent(proxy);
    } catch (e) {
      console.log('[musica] Proxy agent não disponível, sem proxy');
    }
  }
  
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

// ===================== DOWNLOAD GENÉRICO =====================
async function baixar(url, destino) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const writer = fs.createWriteStream(destino);
  let totalSize = 0;
  response.data.on('data', chunk => {
    totalSize += chunk.length;
    if (totalSize > 16 * 1024 * 1024) { response.data.destroy(); writer.destroy(); }
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
    if (!query) return reply('🎵 Use: #musica <nome da música>');

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo + '.m4a');
    const caminhoMp3 = path.join(DOWNLOAD_DIR, nomeArquivo + '.mp3');

    try {
      await reply('🔍 Buscando música...');

      let musica = null;
      let fonte = '';
      
      // 1. Piped (sem rate limit)
      musica = await buscarPiped(query);
      if (musica) fonte = 'Piped';
      
      // 2. YouTube (fallback)
      if (!musica) {
        musica = await buscarYouTube(query);
        if (musica) fonte = 'YouTube';
      }
      
      if (!musica) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo.`);
      }

      await reply(`🎵 ${musica.titulo}\n📡 ${fonte}\n⏳ Baixando...`);

      let urlDownload = null;
      let mimeType = 'audio/m4a';
      let filename = `${musica.titulo}.m4a`;
      
      // Se veio do Piped, usar streams
      if (fonte === 'Piped') {
        try {
          const piped = await baixarPiped(musica.videoId);
          if (piped?.url) {
            urlDownload = piped.url;
            filename = piped.filename;
            mimeType = piped.mimeType;
            console.log('[musica] URL Piped:', urlDownload);
          }
        } catch (e) {
          console.log('[musica] Erro Piped:', e.message);
        }
      }
      
      // Fallback: ytdl-core
      if (!urlDownload) {
        const urlVideo = `https://www.youtube.com/watch?v=${musica.videoId}`;
        let sucesso = false;
        let erro = null;
        
        for (let i = 0; i < 3 && !sucesso; i++) {
          try {
            await baixarYTDL(urlVideo, caminhoMp3);
            sucesso = true;
            
            if (fs.existsSync(caminhoMp3)) {
              const stats = fs.statSync(caminhoMp3);
              if (stats.size > 50000) {
                urlDownload = caminhoMp3;
                filename = `${musica.titulo}.mp3`;
                mimeType = 'audio/mpeg';
              }
            }
          } catch (e) {
            erro = e;
            if (e.message?.includes('429') || e.statusCode === 429) {
              if (i < 2) await delay(20000 * (i + 1));
            } else {
              break;
            }
          }
        }
      }
      
      // Baixar do Piped se conseguiu URL
      if (urlDownload && urlDownload.startsWith('http') && !urlDownload.includes('youtube')) {
        await baixar(urlDownload, caminhoArquivo);
      }
      
      // Verificar qual arquivo enviar
      let arquivoParaEnviar = null;
      let mimeTypeFinal = 'audio/mpeg';
      let filenameFinal = `${musica.titulo}.mp3`;
      
      if (fs.existsSync(caminhoArquivo) && fs.statSync(caminhoArquivo).size > 50000) {
        arquivoParaEnviar = caminhoArquivo;
        mimeTypeFinal = 'audio/m4a';
        filenameFinal = `${musica.titulo}.m4a`;
      } else if (fs.statSync(caminhoMp3).size > 50000) {
        arquivoParaEnviar = caminhoMp3;
        mimeTypeFinal = 'audio/mpeg';
        filenameFinal = `${musica.titulo}.mp3`;
      }
      
      if (!arquivoParaEnviar) {
        return reply('⚠️ Não foi possível baixar. Tente em alguns minutos.');
      }

      const stats = fs.statSync(arquivoParaEnviar);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(arquivoParaEnviar);
        return reply('⚠️ Áudio muito grande!');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(arquivoParaEnviar),
        mimetype: mimeTypeFinal,
        fileName: filenameFinal,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      try { fs.unlinkSync(caminhoMp3); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      try { fs.unlinkSync(caminhoMp3); } catch (e) {}
      return reply('⚠️ Erro ao baixar música.');
    }
  }
};
