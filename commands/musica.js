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

function normalizar(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
}

// Buscar vídeo no YouTube (scrape)
async function buscarYouTube(query) {
  const termos = [query, normalizar(query), query.split('-')[0]?.trim()].filter((v, i, a) => v && a.indexOf(v) === i);
  
  for (const termo of termos) {
    if (!termo || termo.length < 3) continue;
    
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
      const res = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const matches = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
      const titulos = res.data.match(/"title":{"runs":\[{"text":"([^"]+)"/g);
      
      if (matches && matches.length > 0) {
        const videoId = matches[0].match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
        const titulo = titulos?.[0]?.match(/"title":{"runs":\[{"text":"([^"]+)"/)?.[1] || termo;
        
        if (videoId) return { videoId, titulo };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Download via yt-dlp
async function baixarYTDL(query) {
  const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const destino = path.join(DOWNLOAD_DIR, nomeArquivo);
  
  const comandos = [
    `python3 -m ytdlp --extract-audio --audio-format mp3 --audio-quality 3 --max-filesize 15M --no-playlist --no-warnings --output "${destino}.mp3" "ytsearch1:${query}"`,
    `yt-dlp --extract-audio --audio-format mp3 --audio-quality 3 --max-filesize 15M --no-playlist --no-warnings --output "${destino}.mp3" "ytsearch1:${query}"`,
  ];
  
  for (const cmd of comandos) {
    try {
      await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 120000, cwd: DOWNLOAD_DIR }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      const arquivo = `${destino}.mp3`;
      if (fs.existsSync(arquivo) && fs.statSync(arquivo).size > 10000) {
        return arquivo;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// ===================== DEEZER =====================
async function buscarDeezer(query) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    const res = await axios.get(url, { timeout: 10000 });
    
    if (res.data?.data?.length > 0) {
      for (const track of res.data.data) {
        if (track.preview) {
          return {
            titulo: track.title,
            artista: track.artist.name,
            preview: track.preview,
            link: track.link
          };
        }
      }
    }
  } catch (e) {}
  return null;
}

async function baixarDeezer(url, destino) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  
  const writer = fs.createWriteStream(destino);
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
    if (!query) return reply('🎵 Use: #musica <nome da música>');

    limparAntigos();

    try {
      await reply('🔍 Buscando música...');

      let arquivoFinal = null;
      let nomeMusica = query;
      let fonte = '';
      
      // 1. Tentar YouTube (música completa)
      try {
        arquivoFinal = await baixarYTDL(query);
        if (arquivoFinal) {
          fonte = 'YouTube (completo)';
          const stats = fs.statSync(arquivoFinal);
          if (stats.size > 16 * 1024 * 1024) {
            fs.unlinkSync(arquivoFinal);
            arquivoFinal = null;
          }
        }
      } catch (e) {
        console.log('[musica] YouTube falhou:', e.message);
      }
      
      // 2. Fallback: Deezer (preview 30s)
      if (!arquivoFinal) {
        const deezer = await buscarDeezer(query);
        if (deezer?.preview) {
          fonte = 'Deezer (preview 30s)';
          nomeMusica = deezer.titulo;
          
          const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
          const caminho = path.join(DOWNLOAD_DIR, nomeArquivo);
          
          try {
            await baixarDeezer(deezer.preview, caminho);
            if (fs.existsSync(caminho) && fs.statSync(caminho).size > 1000) {
              arquivoFinal = caminho;
            }
          } catch (e) {}
        }
      }
      
      if (!arquivoFinal) {
        return reply('⚠️ Não foi possível baixar. Tente outro termo.');
      }

      const stats = fs.statSync(arquivoFinal);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(arquivoFinal);
        return reply('⚠️ Áudio muito grande!');
      }

      await reply(`🎵 ${nomeMusica}\n📡 ${fonte}`);

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(arquivoFinal),
        mimetype: 'audio/mpeg',
        fileName: `${nomeMusica}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(arquivoFinal); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      return reply('⚠️ Erro ao baixar música.');
    }
  }
};
