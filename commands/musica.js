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

// ===================== CCMIXTER (música completa) =====================
async function buscarCCMixter(query) {
  console.log('[musica] Buscando no CCMixter...');
  try {
    const termo = encodeURIComponent(query);
    const url = `https://ccmixter.org/api/query?tags=${termo}&type=playlist&format=json&limit=5`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (Array.isArray(res.data) && res.data.length > 0) {
      for (const track of res.data) {
        if (track.files && track.files.length > 0) {
          for (const file of track.files) {
            if (file.file_extra) {
              const fileUrl = file.file_extra;
              if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                return {
                  titulo: track.upload_name || query,
                  artista: track.user_name || 'Desconhecido',
                  url: fileUrl,
                  source: 'CCMixter'
                };
              }
            }
          }
        }
      }
    }
    console.log('[musica] CCMixter: nenhum resultado');
  } catch (e) {
    console.log('[musica] CCMixter erro:', e.message);
  }
  return null;
}

// ===================== JAMENDO (música completa) =====================
async function buscarJamendo(query) {
  console.log('[musica] Buscando no Jamendo...');
  try {
    const termo = encodeURIComponent(query);
    const url = `https://api.jamendo.com/v3.0/tracks/?format=json&limit=5&search=${termo}&audioformat=mp32`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.results?.length > 0) {
      for (const track of res.data.results) {
        if (track.audio && track.duration > 30) {
          return {
            titulo: track.name || query,
            artista: track.artist_name || 'Desconhecido',
            url: track.audio,
            source: 'Jamendo'
          };
        }
      }
    }
    console.log('[musica] Jamendo: nenhum resultado');
  } catch (e) {
    console.log('[musica] Jamendo erro:', e.message);
  }
  return null;
}

// ===================== DEEZER (fallback 30s) =====================
async function buscarDeezer(query) {
  console.log('[musica] Buscando no Deezer...');
  try {
    const termo = encodeURIComponent(query);
    const url = `https://api.deezer.com/search?q=${termo}&limit=5`;
    const res = await axios.get(url, { timeout: 15000 });
    
    if (res.data?.data?.length > 0) {
      for (const track of res.data.data) {
        if (track.preview) {
          return {
            titulo: track.title || query,
            artista: track.artist?.name || 'Desconhecido',
            url: track.preview,
            source: 'Deezer'
          };
        }
      }
    }
    console.log('[musica] Deezer: nenhum resultado');
  } catch (e) {
    console.log('[musica] Deezer erro:', e.message);
  }
  return null;
}

async function baixar(url, destino) {
  console.log('[musica] Baixando de:', url);
  
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    throw new Error('URL inválida: ' + url);
  }
  
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
      
      // 1. CCMixter (música completa)
      musica = await buscarCCMixter(query);
      if (musica) fonte = 'CCMixter 🎶';
      
      // 2. Jamendo (música completa)
      if (!musica) {
        musica = await buscarJamendo(query);
        if (musica) fonte = 'Jamendo 🎶';
      }
      
      // 3. Deezer (preview 30s)
      if (!musica) {
        musica = await buscarDeezer(query);
        if (musica) fonte = 'Deezer (preview 30s)';
      }
      
      if (!musica) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo.`);
      }

      await reply(`🎵 ${musica.titulo}${musica.artista ? ' - ' + musica.artista : ''}\n📡 ${fonte}\n⏳ Baixando...`);

      await baixar(musica.url, caminhoArquivo);

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
      console.error('[musica] Erro geral:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      return reply('⚠️ Erro ao baixar música.');
    }
  }
};
