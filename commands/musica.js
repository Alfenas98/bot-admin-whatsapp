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

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===================== CCMIXTER (música completa) =====================
async function buscarCCMixter(query) {
  try {
    const url = `https://ccmixter.org/api/query?tags=${encodeURIComponent(query)}&type=playlist&format=json&limit=5&sort=rank`;
    const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    const data = res.data;
    if (Array.isArray(data) && data.length > 0) {
      for (const track of data) {
        if (track.files && track.files.length > 0) {
          const file = track.files[0];
          if (file.file_extra) {
            return {
              titulo: track.upload_name,
              artista: track.user_name,
              url: file.file_extra,
              source: 'CCMixter'
            };
          }
        }
      }
    }
  } catch (e) { console.log('[musica] CCMixter erro:', e.message); }
  return null;
}

// ===================== JAMENDO (música completa) =====================
async function buscarJamendo(query) {
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?format=json&limit=5&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.results?.length > 0) {
      for (const track of res.data.results) {
        if (track.duration > 30 && track.duration < 600 && track.audio) {
          return {
            titulo: track.name,
            artista: track.artist_name,
            album: track.album_name || '',
            url: track.audio,
            source: 'Jamendo',
            duracao: track.duration
          };
        }
      }
    }
  } catch (e) { console.log('[musica] Jamendo erro:', e.message); }
  return null;
}

// ===================== PIXABAY MUSIC =====================
async function buscarPixabayMusic(query) {
  const PIXABAY_KEY = process.env.PIXABAY_KEY || '46247656-93f5a4e8e7a859f3e3fe12c5e';
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query + ' music')}&video_type=music&per_page=5`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.hits?.length > 0) {
      for (const hit of res.data.hits) {
        if (hit.videos?.medium?.url) {
          return {
            titulo: hit.tags || query,
            artista: hit.user,
            url: hit.videos.medium.url,
            source: 'Pixabay'
          };
        }
      }
    }
  } catch (e) { console.log('[musica] Pixabay erro:', e.message); }
  return null;
}

// ===================== FREEDSOUND =====================
async function buscarFreesound(query) {
  const FREESOUND_KEY = process.env.FREESOUND_KEY || '';
  if (!FREESOUND_KEY) return null;
  
  try {
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=type:mp3 duration:[30 TO 600]&page_size=5&token=${FREESOUND_KEY}`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.results?.length > 0) {
      for (const sound of res.data.results) {
        if (sound.previews?.preview_hq_mp3) {
          return {
            titulo: sound.name,
            artista: sound.username,
            url: sound.previews.preview_hq_mp3,
            source: 'Freesound',
            duracao: sound.duration
          };
        }
      }
    }
  } catch (e) { console.log('[musica] Freesound erro:', e.message); }
  return null;
}

// ===================== DEEZER (fallback 30s) =====================
async function buscarDeezer(query) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.data?.length > 0) {
      for (const track of res.data.data) {
        if (track.preview) {
          return {
            titulo: track.title,
            artista: track.artist.name,
            preview: track.preview,
            link: track.link,
            source: 'Deezer',
            duracao: track.duration
          };
        }
      }
    }
  } catch (e) { console.log('[musica] Deezer erro:', e.message); }
  return null;
}

async function baixar(url, destino) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      let musica = null;
      let fonte = '';
      
      // 1. CCMixter (música completa, sem limite)
      musica = await buscarCCMixter(query);
      if (musica) fonte = 'CCMixter 🎶';
      
      // 2. Jamendo (música completa)
      if (!musica) {
        musica = await buscarJamendo(query);
        if (musica) fonte = 'Jamendo 🎶';
      }
      
      // 3. Pixabay Music
      if (!musica) {
        musica = await buscarPixabayMusic(query);
        if (musica) fonte = 'Pixabay 🎬';
      }
      
      // 4. Freesound
      if (!musica) {
        musica = await buscarFreesound(query);
        if (musica) fonte = 'Freesound 🔊';
      }
      
      // 5. Deezer (preview 30s - último recurso)
      if (!musica) {
        musica = await buscarDeezer(query);
        if (musica) fonte = 'Deezer (preview 30s)';
      }
      
      if (!musica) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo.`);
      }

      await reply(`🎵 ${musica.titulo}${musica.artista ? ' - ' + musica.artista : ''}\n📡 ${fonte}\n⏳ Baixando...`);

      const urlDownload = musica.preview || musica.url;
      await baixar(urlDownload, caminhoArquivo);

      if (!fs.existsSync(caminhoArquivo)) return reply('⚠️ Erro ao processar.');

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size > 16 * 1024 * 1024) { fs.unlinkSync(caminhoArquivo); return reply('⚠️ Áudio muito grande!'); }
      if (stats.size < 5000) { fs.unlinkSync(caminhoArquivo); return reply('⚠️ Download inválido.'); }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(caminhoArquivo),
        mimetype: 'audio/mpeg',
        fileName: `${musica.titulo}.mp3`,
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
