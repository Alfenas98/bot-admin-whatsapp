/**
 * Sistema de Música - Download e envio
 * 
 * Estratégia:
 * 1. Cobalt API (YouTube download)
 * 2. YouTube via yt-dlp (se disponível)
 * 3. Deezer (preview 30s)
 * 4. Link do YouTube (fallback)
 */

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

function normalizar(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
}

// ===================== COBALT API (YouTube Download) =====================
async function baixarCobalt(query) {
  try {
    // Primeiro buscar o videoId
    const youtubeUrl = await buscarYouTubeUrl(query);
    if (!youtubeUrl) return null;
    
    const response = await axios.post('https://api.cobalt.tools/', {
      url: youtubeUrl,
      audioFormat: 'mp3',
      isAudioOnly: true,
      filenameStyle: 'pretty'
    }, {
      timeout: 120000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data?.url) {
      const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
      const destino = path.join(DOWNLOAD_DIR, nomeArquivo);
      
      const audioResponse = await axios.get(response.data.url, {
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const writer = fs.createWriteStream(destino);
      audioResponse.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      if (fs.existsSync(destino) && fs.statSync(destino).size > 10000) {
        return destino;
      }
    }
  } catch (e) {
    console.log('[musica] Cobalt falhou:', e.message);
  }
  return null;
}

// Buscar URL do YouTube
async function buscarYouTubeUrl(query) {
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
      
      const matches = res.data.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/g);
      
      if (matches && matches.length > 0) {
        const videoId = matches[0].match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/)?.[1];
        if (videoId) {
          return `https://youtube.com/watch?v=${videoId}`;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// ===================== YT-DLP =====================
async function baixarYTDL(query) {
  const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const destino = path.join(DOWNLOAD_DIR, nomeArquivo);
  
  const comandos = [
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
      
      // 1. Tentar Cobalt API (YouTube)
      arquivoFinal = await baixarCobalt(query);
      if (arquivoFinal) {
        fonte = 'YouTube (completo)';
      }
      
      // 2. Fallback: yt-dlp
      if (!arquivoFinal) {
        arquivoFinal = await baixarYTDL(query);
        if (arquivoFinal) {
          fonte = 'YouTube (completo)';
        }
      }
      
      // 3. Fallback: Deezer (preview 30s)
      if (!arquivoFinal) {
        const deezer = await buscarDeezer(query);
        if (deezer?.preview) {
          fonte = 'Deezer (preview 30s)';
          nomeMusica = `${deezer.titulo} - ${deezer.artista}`;
          
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

      // 4. Fallback: link do YouTube
      if (!arquivoFinal) {
        const youtubeUrl = await buscarYouTubeUrl(query);
        if (youtubeUrl) {
          return reply(`🎵 ${query}\n\n🔗 ${youtubeUrl}\n\n⚠️ Download indisponível. Clique no link para ouvir!`);
        }
        return reply('⚠️ Não foi possível encontrar a música.');
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
