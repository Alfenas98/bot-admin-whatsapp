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

function normalizarBusca(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// DEEZER - Busca e download do preview
async function buscarDeezer(query) {
  try {
    const termos = [
      query,
      normalizarBusca(query),
      query.split('-')[0]?.trim(),
      query.split(' ').slice(0, 3).join(' ')
    ].filter((v, i, a) => v && a.indexOf(v) === i);
    
    for (const termo of termos) {
      try {
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(termo)}&limit=5&output=jsonp`;
        const res = await axios.get(url, {
          timeout: 15000,
          responseType: 'text'
        });
        
        // Deezer retorna JSONP, precisamos extrair o JSON
        let jsonStr = res.data;
        const match = jsonStr.match(/jsonp_\d+\((.*)\)/s);
        if (match) {
          jsonStr = match[1];
        }
        
        const data = JSON.parse(jsonStr);
        
        if (data.data?.length > 0) {
          for (const track of data.data) {
            if (track.preview) {
              return {
                titulo: track.title,
                artista: track.artist.name,
                album: track.album?.title || '',
                preview: track.preview,
                link: track.link,
                source: 'Deezer',
                duracao: track.duration
              };
            }
          }
        }
      } catch (e) {
        console.log(`[musica] Deezer "${termo}" erro:`, e.message);
        continue;
      }
    }
  } catch (e) {
    console.log('[musica] Erro Deezer:', e.message);
  }
  return null;
}

// JAMENDO - Música Creative Commons (completa)
async function buscarJamendo(query) {
  try {
    const termos = [query, normalizarBusca(query)];
    
    for (const termo of termos) {
      try {
        const url = `https://api.jamendo.com/v3.0/tracks/?format=json&limit=5&search=${encodeURIComponent(termo)}&include=musicinfo&audioformat=mp32`;
        const res = await axios.get(url, { timeout: 15000 });
        
        if (res.data?.results?.length > 0) {
          for (const track of res.data.results) {
            if (track.duration > 30 && track.duration < 600) {
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
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    console.log('[musica] Erro Jamendo:', e.message);
  }
  return null;
}

// OPENVERSE - Creative Commons
async function buscarOpenverse(query) {
  try {
    const url = `https://api.openverse.engineering/v1/audio/?q=${encodeURIComponent(query)}&license=by,by-sa,pdm,cc0&limit=5`;
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'HermesBot/1.0' }
    });
    
    if (res.data?.results?.length > 0) {
      for (const audio of res.data.results) {
        if (audio.url && audio.filetype === 'mp3') {
          return {
            titulo: audio.title || query,
            artista: audio.creator || 'Desconhecido',
            url: audio.url,
            source: 'Openverse',
            duracao: audio.duration || 0
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Openverse:', e.message);
  }
  return null;
}

// FREEDSOUND - Sons e músicas
async function buscarFreesound(query) {
  const FREESOUND_KEY = process.env.FREESOUND_KEY || '';
  if (!FREESOUND_KEY) return null;
  
  try {
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=type:mp3&page_size=3&token=${FREESOUND_KEY}`;
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
  } catch (e) {}
  return null;
}

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
      return reply('🎵 Use: #musica <nome da música>\nExemplo:\n#musica Hungria não troco\n#musica jazz relaxante');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      let musica = null;
      let fonte = '';
      
      // 1. Jamendo (música completa, CC)
      musica = await buscarJamendo(query);
      if (musica) fonte = 'Jamendo';
      
      // 2. Openverse (CC)
      if (!musica) {
        musica = await buscarOpenverse(query);
        if (musica) fonte = 'Openverse';
      }
      
      // 3. Freesound
      if (!musica) {
        musica = await buscarFreesound(query);
        if (musica) fonte = 'Freesound';
      }
      
      // 4. Deezer (preview 30s - sempre funciona)
      if (!musica) {
        musica = await buscarDeezer(query);
        if (musica) fonte = 'Deezer';
      }
      
      if (!musica) {
        return reply(`⚠️ Não encontrei "${query}".\n\nDicas:\n• Verifique a ortografia\n• Use termos em inglês (ex: "jazz", "lofi")\n• Tente nomes de artistas`);
      }

      const isPreview = musica.source === 'Deezer';
      const mensagem = isPreview 
        ? `🎵 ${musica.titulo} - ${musica.artista}\n📡 ${fonte} (preview 30s)\n⏳ Baixando...`
        : `🎵 ${musica.titulo} - ${musica.artista}\n📡 ${fonte}\n⏳ Baixando...`;
      
      await reply(mensagem);

      await baixar(musica.url, caminhoArquivo);

      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao processar.');
      }

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Áudio muito grande!');
      }

      if (stats.size < 5000) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Download inválido. Tente outro termo.');
      }

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
      return reply('⚠️ Erro ao baixar. Tente outro termo.');
    }
  }
};
