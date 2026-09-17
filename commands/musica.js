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
      const urlBusca = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
      const resBusca = await axios.get(urlBusca, { timeout: 10000 });
      
      if (resBusca.data?.items?.length > 0) {
        for (const item of resBusca.data.items) {
          const videoId = item.id.videoId;
          const titulo = item.snippet.title;
          
          let duracaoMs = 0;
          try {
            const urlDetalhes = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
            const resDetalhes = await axios.get(urlDetalhes, { timeout: 10000 });
            if (resDetalhes.data?.items?.[0]) {
              duracaoMs = parseISO8601Duration(resDetalhes.data.items[0].contentDetails.duration);
            }
          } catch (e) {}
          
          if (duracaoMs < 10 * 60 * 1000) {
            return { videoId, titulo, duracaoMs };
          }
        }
      }
    } catch (e) {
      console.log('[musica] Erro YouTube API:', e.message);
    }
  }

  // Fallback: scrape do YouTube
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
  const caminhos = [
    'yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/root/.local/bin/yt-dlp',
    `${process.env.HOME}/.local/bin/yt-dlp`
  ];
  
  for (const ytdlp of caminhos) {
    try {
      const comando = [
        `"${ytdlp}"`,
        '--extract-audio',
        '--audio-format mp3',
        '--audio-quality 5',
        '--max-filesize 15M',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
        `--output "${caminhoSaida}"`,
        `"${urlVideo}"`
      ].join(' ');
      
      await new Promise((resolve, reject) => {
        exec(comando, { timeout: 120000, cwd: DOWNLOAD_DIR }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      return true;
    } catch (e) {
      continue;
    }
  }
  
  return false;
}

async function baixarComAxios(urlVideo, caminhoSaida) {
  try {
    const ytdl = require('@distube/ytdl-core');
    
    const info = await ytdl.getInfo(urlVideo);
    const stream = ytdl(urlVideo, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
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
    throw new Error('Falha no download: ' + e.message);
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

      if (duracaoMs > 10 * 60 * 1000) {
        return reply('⚠️ Música muito longa! Máximo de 10 minutos.');
      }

      await reply(`🎵 Baixando: ${titulo}\n⏳ Aguarde...`);

      const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;
      
      let sucesso = false;
      let ultimoErro = null;
      
      // Tentar yt-dlp primeiro
      try {
        sucesso = await baixarComYtDlp(urlVideo, caminhoArquivo);
      } catch (e) {
        console.log('[musica] yt-dlp falhou:', e.message);
        ultimoErro = e;
      }
      
      // Fallback: ytdl-core
      if (!sucesso) {
        try {
          await baixarComAxios(urlVideo, caminhoArquivo);
          sucesso = true;
        } catch (e2) {
          console.log('[musica] ytdl-core falhou:', e2.message);
          ultimoErro = e2;
        }
      }
      
      if (!sucesso) {
        if (ultimoErro?.message?.includes('429') || ultimoErro?.statusCode === 429) {
          return reply('⚠️ YouTube está limitando requisições. Tente novamente em 5-10 minutos.');
        }
        throw ultimoErro || new Error('Falha desconhecida');
      }

      // Encontrar arquivo
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

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(arquivoFinal),
        mimetype: 'audio/mpeg',
        fileName: `${titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(arquivoFinal); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      
      if (err.message.includes('429')) {
        return reply('⚠️ YouTube está limitando requisições. Tente novamente em alguns minutos.');
      }
      
      return reply('⚠️ Erro ao baixar música. Tente outro termo ou aguarde alguns minutos.');
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
