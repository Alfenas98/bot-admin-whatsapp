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

// ===================== YOUTUBE STREAMING =====================
async function baixarYouTubeStream(videoId) {
  try {
    console.log('[musica] Tentando streaming do YouTube...');
    
    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const destino = path.join(DOWNLOAD_DIR, `${nomeArquivo}.mp3`);
    
    // Usar Invidious API para pegar stream de áudio
    const instancias = [
      'https://invidious.nerdvpn.de',
      'https://invidious.jing.rocks',
      'https://yewtu.be',
      'https://invidious.fdn.fr'
    ];
    
    for (const base of instancias) {
      try {
        // Pegar informações do vídeo
        const infoRes = await axios.get(`${base}/api/v1/videos/${videoId}`, { timeout: 10000 });
        const info = infoRes.data;
        
        // Pegar formato de áudio
        const audioFormats = info.adaptiveFormats?.filter(f => f.type?.includes('audio')) || [];
        
        if (audioFormats.length > 0) {
          // Pegar o melhor áudio
          const bestAudio = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          
          if (bestAudio?.url) {
            const audioResponse = await axios.get(bestAudio.url, {
              responseType: 'stream',
              timeout: 120000
            });
            
            const writer = fs.createWriteStream(destino);
            audioResponse.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            // Converter para mp3 usando ffmpeg
            if (fs.existsSync(destino) && fs.statSync(destino).size > 10000) {
              const mp3Destino = destino.replace(/\.[^.]+$/, '.mp3');
              
              await new Promise((resolve) => {
                const { exec } = require('child_process');
                exec(`ffmpeg -i "${destino}" -codec:a libmp3lame -qscale:a 3 "${mp3Destino}" -y`, (error) => {
                  if (!error && fs.existsSync(mp3Destino)) {
                    fs.unlinkSync(destino);
                    resolve();
                  } else {
                    // Manter arquivo original se conversão falhar
                    mp3Destino !== destino && fs.existsSync(mp3Destino) && fs.unlinkSync(mp3Destino);
                    resolve();
                  }
                });
              });
              
              const finalFile = fs.existsSync(mp3Destino) ? mp3Destino : destino;
              if (fs.existsSync(finalFile) && fs.statSync(finalFile).size > 10000) {
                console.log('[musica] Streaming OK!');
                return { arquivo: finalFile, titulo: info.title };
              }
            }
          }
        }
      } catch (e) {
        console.log(`[musica] Instância ${base} falhou:`, e.message);
      }
    }
  } catch (e) {
    console.log('[musica] Streaming falhou:', e.message);
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

// ===================== BUSCAR VIDEO ID =====================
async function buscarVideoId(query) {
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
        return match.group(1);
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
      
      let arquivoFinal = null;
      let nomeMusica = query;
      let fonte = '';
      
      // 1. Buscar videoId
      const videoId = await buscarVideoId(query);
      
      if (videoId) {
        // 2. Tentar streaming do YouTube
        const resultado = await baixarYouTubeStream(videoId);
        if (resultado) {
          arquivoFinal = resultado.arquivo;
          nomeMusica = resultado.titulo || query;
          fonte = 'YouTube';
        }
      }
      
      // 3. Fallback: Deezer (preview 30s)
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

      if (!arquivoFinal) {
        return reply('⚠️ Música não encontrada. Tente outro termo.');
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
