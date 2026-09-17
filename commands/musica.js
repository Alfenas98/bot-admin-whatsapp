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

// DEEZER API - Sem rate limit, sempre funciona
async function buscarDeezer(query) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10&output=jsonp`;
    const res = await axios.get(url, {
      timeout: 15000,
      responseType: 'text'
    });
    
    let jsonStr = res.data;
    const match = jsonStr.match(/jsonp_\d+\((.*)\)/s);
    if (match) jsonStr = match[1];
    
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
            duracao: track.duration
          };
        }
      }
    }
  } catch (e) {
    console.log('[musica] Erro Deezer:', e.message);
  }
  return null;
}

async function baixar(url, destino) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60000,
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
      return reply('🎵 Use: #musica <nome da música>\nExemplo:\n#musica Asa - Bebê\n#musica Matuê');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      const musica = await buscarDeezer(query);
      
      if (!musica) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo.`);
      }

      await reply(`🎵 ${musica.titulo} - ${musica.artista}\n⏳ Baixando...`);

      await baixar(musica.preview, caminhoArquivo);

      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao baixar.');
      }

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size < 1000) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Download inválido.');
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
      return reply('⚠️ Erro ao baixar música.');
    }
  }
};
