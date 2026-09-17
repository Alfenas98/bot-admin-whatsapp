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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// JAMENDO API - Música gratuita, sem rate limit
async function buscarJamendo(query) {
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?format=json&limit=5&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.results?.length > 0) {
      for (const track of res.data.results) {
        if (track.duration > 0 && track.duration < 600) { // máximo 10 min
          return {
            id: track.id,
            titulo: track.name,
            artista: track.artist_name,
            album: track.album_name,
            duracao: track.duration,
            url: track.audio,
            source: 'jamendo'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Jamendo:', e.message);
  }
  return null;
}

// FREEMUSICARCHIVE API
async function buscarFMA(query) {
  try {
    const url = `https://freemusicarchive.org/api/get/track.json?q=${encodeURIComponent(query)}&limit=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.dataset?.length > 0) {
      for (const track of res.data.dataset) {
        if (track.track_url && track.track_duration < 600) {
          // FMA tem download direto
          return {
            titulo: track.track_title,
            artista: track.artist_name,
            album: track.album_title,
            url: track.track_url,
            source: 'fma'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro FMA:', e.message);
  }
  return null;
}

// CCMIXTER API - Música livre
async function buscarCCMixter(query) {
  try {
    const url = `https://ccmixter.org/api/query?tags=${encodeURIComponent(query)}&type=playlist&format=json&limit=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.length > 0) {
      for (const track of res.data) {
        if (track.upload_name && track.files?.[0]?.file_extra) {
          return {
            titulo: track.upload_name,
            artista: track.user_name,
            url: track.files[0].file_extra,
            source: 'ccmixter'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro CCMixter:', e.message);
  }
  return null;
}

// INTERNET ARCHIVE - Audio
async function buscarInternetArchive(query) {
  try {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)+"+medietype:audio"}&fl[]=identifier,title,creator&output=json&rows=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.response?.docs?.length > 0) {
      for (const item of res.data.response.docs) {
        const identifier = item.identifier;
        const title = item.title;
        const creator = item.creator || 'Desconhecido';
        
        // Buscar metadados para obter URL do arquivo de áudio
        try {
          const metaUrl = `https://archive.org/metadata/${identifier}`;
          const metaRes = await axios.get(metaUrl, { timeout: 15000 });
          
          if (metaRes.data?.files) {
            const mp3File = metaRes.data.files.find(f => f.name && (f.name.endsWith('.mp3') || f.name.endsWith('.ogg')));
            if (mp3File) {
              return {
                titulo: title,
                artista: creator,
                url: `https://archive.org/download/${identifier}/${encodeURIComponent(mp3File.name)}`,
                source: 'internetarchive'
              };
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Internet Archive:', e.message);
  }
  return null;
}

// BENSOUND - Música gratuita
async function buscarBensound(query) {
  try {
    const url = `https://www.bensound.com/api/search?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.tracks?.length > 0) {
      for (const track of res.data.tracks) {
        return {
          titulo: track.name,
          artista: 'Bensound',
          url: track.mp3Url,
          source: 'bensound'
        };
      }
    }
  } catch (e) {
    console.log('[musica] Erro Bensound:', e.message);
  }
  return null;
}

// SOUNDCLOUD - Busca e download
async function buscarSoundCloud(query) {
  try {
    // Usar API pública do SoundCloud
    const url = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=3&client_id=YOUR_CLIENT_ID`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.length > 0) {
      for (const track of res.data) {
        if (track.download_url) {
          return {
            titulo: track.title,
            artista: track.user.username,
            url: track.download_url,
            source: 'soundcloud'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro SoundCloud:', e.message);
  }
  return null;
}

// Download genérico com fallback de proxy
async function baixarAudio(url, caminhoSaida) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*'
    },
    maxRedirects: 5
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
      return reply('🎵 Use: #musica <nome da música>\nExemplo:\n#musica Asa - Bebê\n#musica Matuê - Somos Iguais');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      // Tentar múltiplas fontes em ordem de qualidade
      let resultado = null;
      let fonte = '';
      
      // 1. Tentar Jamendo (música livre)
      resultado = await buscarJamendo(query);
      if (resultado) fonte = 'Jamendo';
      
      // 2. Internet Archive
      if (!resultado) {
        resultado = await buscarInternetArchive(query);
        if (resultado) fonte = 'Internet Archive';
      }
      
      // 3. CCMixter
      if (!resultado) {
        resultado = await buscarCCMixter(query);
        if (resultado) fonte = 'CCMixter';
      }
      
      // 4. Free Music Archive
      if (!resultado) {
        resultado = await buscarFMA(query);
        if (resultado) fonte = 'FMA';
      }
      
      // 5. Bensound
      if (!resultado) {
        resultado = await buscarBensound(query);
        if (resultado) fonte = 'Bensound';
      }
      
      // 6. SoundCloud
      if (!resultado) {
        resultado = await buscarSoundCloud(query);
        if (resultado) fonte = 'SoundCloud';
      }
      
      if (!resultado) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo ou verifique a ortografia.`);
      }

      await reply(`🎵 ${resultado.titulo} - ${resultado.artista}\n📡 Via: ${fonte}\n⏳ Baixando...`);

      // Baixar o áudio
      await baixarAudio(resultado.url, caminhoArquivo);

      // Validar arquivo
      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao processar áudio.');
      }

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Áudio muito grande! Máximo 16MB.');
      }

      if (stats.size < 10000) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Download inválido. Tente outro termo.');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(caminhoArquivo),
        mimetype: 'audio/mpeg',
        fileName: `${resultado.titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      
      return reply('⚠️ Erro ao baixar música. Tente novamente.');
    }
  }
};
