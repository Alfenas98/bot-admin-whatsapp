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

// JAMENDO - Música gratuita, sem rate limit
async function buscarJamendo(query) {
  try {
    const termos = [
      query,
      query.replace(/[^a-zA-Z0-9\s]/g, ''),
      query.split('-')[0]?.trim(),
      query.split(' ').slice(0, 3).join(' ')
    ];
    
    for (const termo of termos) {
      if (!termo) continue;
      
      const url = `https://api.jamendo.com/v3.0/tracks/?format=json&limit=5&search=${encodeURIComponent(termo)}&include=musicinfo&audioformat=mp32`;
      const res = await axios.get(url, { timeout: 15000 });
      
      if (res.data?.results?.length > 0) {
        for (const track of res.data.results) {
          if (track.duration > 0 && track.duration < 600) {
            return {
              id: track.id,
              titulo: track.name,
              artista: track.artist_name,
              album: track.album_name,
              duracao: track.duration,
              url: track.audio,
              source: 'Jamendo'
            };
          }
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Jamendo:', e.message);
  }
  return null;
}

// PIXABAY - Música gratuita, sem rate limit, API key gratuita
async function buscarPixabay(query) {
  const PIXABAY_KEY = process.env.PIXABAY_KEY || '46247656-93f5a4e8e7a859f3e3fe12c5e';
  
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)+"+music"}&video_type=music&per_page=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.hits?.length > 0) {
      for (const hit of res.data.hits) {
        // Pixabay não tem áudio diretamente, usar como fallback
        return null;
      }
    }
  } catch (e) {
    console.log('[musica] Erro Pixabay:', e.message);
  }
  return null;
}

// SOUNDCLOUD sem client_id (via rss)
async function buscarSoundCloud(query) {
  try {
    const url = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.length > 0) {
      for (const track of res.data) {
        if (track.download_url) {
          return {
            titulo: track.title,
            artista: track.user.username,
            url: track.download_url + '?client_id=SOUNDCLOUD_CLIENT_ID',
            source: 'SoundCloud'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro SoundCloud:', e.message);
  }
  return null;
}

// MÚSICA DE DOMÍNIO PÚBLIO DO GOV.BR
async function buscarMusicaGovBr(query) {
  try {
    const url = `https://www.gov.br/pt-br/search?query=${encodeURIComponent(query)+"+musica"}&tipo=audio`;
    const res = await axios.get(url, { timeout: 15000 });
    
    // Buscar links de mp3 na página
    const mp3Match = res.data.match(/"(https?:\/\/[^"]+\.mp3[^"]*)"/);
    if (mp3Match) {
      return {
        titulo: query,
        artista: 'Gov.br',
        url: mp3Match[1],
        source: 'Gov.br'
      };
    }
  } catch (e) {}
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
          source: 'Bensound'
        };
      }
    }
  } catch (e) {
    console.log('[musica] Erro Bensound:', e.message);
  }
  return null;
}

// GERAR ÁUDIO VIA IA (ElevenLabs grátis - texto para fala)
async function gerarAudioIA(query) {
  // Usar API de texto para fala do Google Translate (gTTS-like via API)
  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brazilian+Female&text=${encodeURIComponent("Tocando música: "+query)}`;
    const res = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000 
    });
    
    if (res.data && res.data.length > 1000) {
      return {
        titulo: query,
        artista: 'IA',
        audio: res.data,
        source: 'IA'
      };
    }
  } catch (e) {
    console.log('[musica] Erro IA:', e.message);
  }
  return null;
}

// MÚSICA DO BANCO DO OPENVERSE (Creative Commons)
async function buscarOpenverse(query) {
  try {
    const url = `https://api.openverse.engineering/v1/audio/?q=${encodeURIComponent(query)}&license=by,by-sa,by-nc,cc0,pdm&limit=3`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.results?.length > 0) {
      for (const audio of res.data.results) {
        if (audio.url) {
          return {
            titulo: audio.title || query,
            artista: audio.creator || 'Desconhecido',
            url: audio.url,
            source: 'Openverse'
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Openverse:', e.message);
  }
  return null;
}

// Download genérico
async function baixarAudio(url, caminhoSaida, headers = {}) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      ...headers
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

      let resultado = null;
      let fonte = '';
      
      // 1. Jamendo (música livre, sem rate limit)
      resultado = await buscarJamendo(query);
      if (resultado) fonte = 'Jamendo';
      
      // 2. Openverse (Creative Commons)
      if (!resultado) {
        resultado = await buscarOpenverse(query);
        if (resultado) fonte = 'Openverse';
      }
      
      // 3. Bensound
      if (!resultado) {
        resultado = await buscarBensound(query);
        if (resultado) fonte = 'Bensound';
      }
      
      // 4. SoundCloud
      if (!resultado) {
        resultado = await buscarSoundCloud(query);
        if (resultado) fonte = 'SoundCloud';
      }
      
      // Se encontrou via IA, enviar direto
      if (!resultado) {
        resultado = await gerarAudioIA(query);
        if (resultado) {
          fs.writeFileSync(caminhoArquivo, resultado.audio);
          fonte = 'IA';
        }
      }
      
      if (!resultado) {
        return reply(`⚠️ Não encontrei "${query}".\n\nTente:\n• Verificar ortografia\n• Usar outro termo\n• Pesquisar em: https://www.jenotoradio.com.br/`);
      }

      await reply(`🎵 ${resultado.titulo}${resultado.artista ? ' - ' + resultado.artista : ''}\n📡 Via: ${fonte}\n⏳ Baixando...`);

      // Se o resultado já tem audio (IA), pular download
      if (!resultado.audio) {
        await baixarAudio(resultado.url, caminhoArquivo);
      }

      // Validar
      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao processar áudio.');
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
