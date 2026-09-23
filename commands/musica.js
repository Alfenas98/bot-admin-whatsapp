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

function normalizar(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
}

// ===================== YOUTUBE DOWNLOAD =====================
async function baixarYouTube(query) {
  try {
    const ytdlp = require('yt-dlp-wrap').default;
    const downloader = new ytdlp();
    
    console.log('[musica] Tentando yt-dlp...');
    
    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const destino = path.join(DOWNLOAD_DIR, `${nomeArquivo}.mp3`);
    
    // Executar yt-dlp
    const output = await downloader.execPromise([
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '3',
      '--max-filesize', '15M',
      '--no-playlist',
      '--output', destino,
      `ytsearch1:${query}`
    ]);
    
    if (fs.existsSync(destino) && fs.statSync(destino).size > 10000) {
      console.log('[musica] yt-dlp OK!');
      return { arquivo: destino, nome: query, fonte: 'YouTube' };
    }
  } catch (e) {
    console.log('[musica] yt-dlp falhou:', e.message);
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
            preview: track.preview
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
    timeout: 60000
  });
  
  const writer = fs.createWriteStream(destino);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// ===================== YOUTUBE URL =====================
async function buscarYouTubeUrl(query) {
  const termos = [query, normalizar(query)];
  
  for (const termo of termos) {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const match = res.data.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/);
      if (match) {
        return `https://youtube.com/watch?v=${match[1]}`;
      }
    } catch (e) {}
  }
  return null;
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
      
      let resultado = null;
      let arquivoFinal = null;
      let nomeMusica = query;
      let fonte = '';
      
      // 1. Tentar yt-dlp (YouTube completo)
      resultado = await baixarYouTube(query);
      if (resultado) {
        arquivoFinal = resultado.arquivo;
        nomeMusica = resultado.nome;
        fonte = resultado.fonte;
      }
      
      // 2. Fallback: Deezer (preview 30s)
      if (!arquivoFinal) {
        const deezer = await buscarDeezer(query);
        if (deezer?.preview) {
          fonte = 'Deezer (30s)';
          nomeMusica = `${deezer.titulo} - ${deezer.artista}`;
          
          const nomeArquivo = `${Date.now()}_deezer.mp3`;
          const caminho = path.join(DOWNLOAD_DIR, nomeArquivo);
          
          try {
            await baixarDeezer(deezer.preview, caminho);
            if (fs.existsSync(caminho) && fs.statSync(caminho).size > 1000) {
              arquivoFinal = caminho;
            }
          } catch (e) {}
        }
      }

      // 3. Fallback: link do YouTube
      if (!arquivoFinal) {
        const youtubeUrl = await buscarYouTubeUrl(query);
        if (youtubeUrl) {
          return reply(`🎵 ${query}\n\n🔗 ${youtubeUrl}\n\n⚠️ Download indisponível no momento. Clique no link para ouvir!`);
        }
        return reply('⚠️ Música não encontrada. Tente outro termo.');
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
