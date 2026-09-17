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

// Remover acentos para busca
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Buscar vídeo no YouTube via scrape (sem API key)
async function buscarVideoId(query) {
  const termosBusca = [
    query,
    removerAcentos(query),
    query.split('-')[0]?.trim(),
    query.replace(/[^a-zA-Z0-9\s]/g, ''),
    query.split(' ').slice(0, 3).join(' ')
  ];
  
  for (const termo of termosBusca) {
    if (!termo) continue;
    
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      });
      
      // Buscar videoId e título
      const videoIdMatch = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
      const titleMatch = res.data.match(/"title":{"runs":\[{"text":"([^"]+)"/g);
      
      if (videoIdMatch && videoIdMatch.length > 0) {
        for (let i = 0; i < Math.min(videoIdMatch.length, 5); i++) {
          const vid = videoIdMatch[i].match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
          const tit = titleMatch?.[i]?.match(/"title":{"runs":\[{"text":"([^"]+)"/)?.[1] || termo;
          
          if (vid) {
            return { videoId: vid, titulo: tit };
          }
        }
      }
    } catch (e) {
      console.log(`[musica] Erro busca "${termo}":`, e.message);
      continue;
    }
  }
  
  return null;
}

// Baixar via ytdl-core
async function baixarYTDL(urlVideo, caminhoSaida) {
  const ytdl = require('@distube/ytdl-core');
  
  const info = await ytdl.getInfo(urlVideo);
  
  const formatos = info.formats.filter(f => 
    f.hasAudio && !f.hasVideo && 
    f.contentLength && parseInt(f.contentLength) < 15 * 1024 * 1024
  );
  
  let url;
  if (formatos.length > 0) {
    const melhor = formatos.sort((a, b) => 
      parseInt(b.contentLength || 0) - parseInt(a.contentLength || 0)
    )[0];
    url = melhor.url;
  } else {
    // Stream direto
    const stream = ytdl(urlVideo, { quality: 'lowestaudio', filter: 'audioonly' });
    const writeStream = fs.createWriteStream(caminhoSaida);
    let totalSize = 0;
    
    stream.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > 15 * 1024 * 1024) stream.destroy();
    });
    
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  }
  
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000
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
      return reply('🎵 Use: #musica <nome da música>');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      // Buscar vídeo no YouTube (via scrape)
      let video = await buscarVideoId(query);
      
      if (!video) {
        return reply(`⚠️ Não encontrei "${query}". Tente outro termo.`);
      }

      await reply(`🎵 ${video.titulo}\n⏳ Baixando...`);

      const urlVideo = `https://www.youtube.com/watch?v=${video.videoId}`;
      
      // Baixar via ytdl-core com retry
      let sucesso = false;
      let erro = null;
      
      for (let i = 0; i < 3 && !sucesso; i++) {
        try {
          await baixarYTDL(urlVideo, caminhoArquivo);
          sucesso = true;
        } catch (e) {
          erro = e;
          console.log(`[musica] Tentativa ${i+1} falhou:`, e.message);
          
          if (e.message?.includes('429') || e.statusCode === 429) {
            if (i < 2) await delay(20000 * (i + 1));
          } else if (e.message?.includes('too_large')) {
            return reply('⚠️ Música muito grande!');
          } else {
            break;
          }
        }
      }
      
      if (!sucesso) {
        return reply('⚠️ YouTube está limitando requisições. Tente em 5-10 minutos.');
      }

      // Validar
      if (!fs.existsSync(caminhoArquivo)) {
        return reply('⚠️ Erro ao processar.');
      }

      const stats = fs.statSync(caminhoArquivo);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Áudio muito grande!');
      }

      if (stats.size < 10000) {
        fs.unlinkSync(caminhoArquivo);
        return reply('⚠️ Download inválido.');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(caminhoArquivo),
        mimetype: 'audio/mpeg',
        fileName: `${video.titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      return reply('⚠️ Erro ao processar música.');
    }
  }
};
