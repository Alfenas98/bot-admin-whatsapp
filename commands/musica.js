const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp', 'music');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function limparAntigos() {
  try {
    const agora = Date.now();
    const arquivos = fs.readdirSync(DOWNLOAD_DIR);
    arquivos.forEach(arq => {
      const caminho = path.join(DOWNLOAD_DIR, arq);
      const stat = fs.statSync(caminho);
      if (agora - stat.mtimeMs > 10 * 60 * 1000) {
        try { fs.unlinkSync(caminho); } catch (e) {}
      }
    });
  } catch (e) {}
}

async function buscarYouTube(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
  
  if (YOUTUBE_API_KEY) {
    try {
      const urlBusca = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
      const resBusca = await axios.get(urlBusca, { timeout: 10000 });
      
      if (resBusca.data?.items?.length > 0) {
        const videoId = resBusca.data.items[0].id.videoId;
        const titulo = resBusca.data.items[0].snippet.title;
        
        let duracaoMs = 0;
        try {
          const urlDetalhes = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
          const resDetalhes = await axios.get(urlDetalhes, { timeout: 10000 });
          if (resDetalhes.data?.items?.[0]) {
            duracaoMs = parseISO8601Duration(resDetalhes.data.items[0].contentDetails.duration);
          }
        } catch (e) {}
        
        return { videoId, titulo, duracaoMs };
      }
    } catch (e) {
      console.log('[musica] Erro YouTube API:', e.message);
    }
  }

  // Fallback: scrape
  try {
    const urlScrape = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const resScrape = await axios.get(urlScrape, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const match = resScrape.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match) {
      const videoId = match[1];
      const titleMatch = resScrape.data.match(/"title":{"runs":\[{"text":"([^"]+)"/);
      const titulo = titleMatch ? titleMatch[1] : query;
      return { videoId, titulo, duracaoMs: 0 };
    }
  } catch (e) {
    console.log('[musica] Erro scrape:', e.message);
  }

  return null;
}

async function baixarComYtDlp(urlVideo, caminhoSaida) {
  return new Promise((resolve, reject) => {
    const comando = `yt-dlp --extract-audio --audio-format mp3 --audio-quality 5 --max-filesize 15M --no-playlist --no-warnings --output "${caminhoSaida}" "${urlVideo}"`;
    
    exec(comando, { timeout: 120000, cwd: DOWNLOAD_DIR }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function baixarComAxios(urlVideo, caminhoSaida) {
  // Fallback usando ytdl-core
  try {
    const ytdl = require('@distube/ytdl-core');
    const stream = ytdl(urlVideo, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    const writeStream = fs.createWriteStream(caminhoSaida);
    
    let totalSize = 0;
    stream.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > 15 * 1024 * 1024) {
        stream.destroy();
        throw new Error('Arquivo muito grande');
      }
    });
    
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  } catch (e) {
    throw new Error('ytdl-core não disponível: ' + e.message);
  }
}

module.exports = {
  name: 'musica',
  aliases: ['music', 'song', 'tocar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const query = args.join(' ');
    
    if (!query) {
      return reply('⚠️ Use: #musica <nome da música>\nExemplo:\n#musica Asa - Bebê\n#musica Matuê - Somos Iguais');
    }

    limparAntigos();

    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const caminhoArquivo = path.join(DOWNLOAD_DIR, nomeArquivo);

    try {
      await reply('🔍 Buscando música...');

      // Buscar vídeo
      const resultado = await buscarYouTube(query);
      
      if (!resultado) {
        return reply(`⚠️ Não encontrei nenhum resultado para "${query}".`);
      }

      const { videoId, titulo, duracaoMs } = resultado;

      // Verificar duração
      if (duracaoMs > 8 * 60 * 1000) {
        return reply('⚠️ Música muito longa! Máximo de 8 minutos.');
      }

      await reply(`🎵 Baixando: ${titulo}\n⏳ Aguarde...`);

      const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Tentar yt-dlp primeiro, depois ytdl-core
      try {
        await baixarComYtDlp(urlVideo, caminhoArquivo.replace('.mp3', '.%(ext)s'));
      } catch (e) {
        console.log('[musica] yt-dlp falhou, usando ytdl-core');
        await baixarComAxios(urlVideo, caminhoArquivo);
      }

      // Encontrar arquivo (yt-dlp pode mudar a extensão)
      let arquivoFinal = caminhoArquivo;
      if (!fs.existsSync(caminhoArquivo)) {
        const arquivos = fs.readdirSync(DOWNLOAD_DIR);
        const mp3 = arquivos.find(f => f.endsWith('.mp3'));
        if (mp3) arquivoFinal = path.join(DOWNLOAD_DIR, mp3);
      }

      if (!fs.existsSync(arquivoFinal)) {
        return reply('⚠️ Erro ao processar áudio.');
      }

      const stats = fs.statSync(arquivoFinal);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(arquivoFinal);
        return reply('⚠️ Áudio muito grande! Tente uma música mais curta.');
      }

      // Enviar
      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(arquivoFinal),
        mimetype: 'audio/mpeg',
        fileName: `${titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      // Limpar
      try { fs.unlinkSync(arquivoFinal); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      return reply('⚠️ Erro ao baixar música. Verifique se o yt-dlp está instalado.');
    }
  }
};

function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const horas = parseInt(match[1] || 0);
  const minutos = parseInt(match[2] || 0);
  const segundos = parseInt(match[3] || 0);
  return (horas * 3600 + minutos * 60 + segundos) * 1000;
}
