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

      // 1. Buscar vídeo no YouTube para obter ID
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
      let videoId = null;
      let titulo = query;

      if (YOUTUBE_API_KEY) {
        try {
          const urlBusca = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
          const resBusca = await axios.get(urlBusca, { timeout: 10000 });
          
          if (resBusca.data?.items?.length > 0) {
            videoId = resBusca.data.items[0].id.videoId;
            titulo = resBusca.data.items[0].snippet.title;
          }
        } catch (e) {
          console.log('[musica] Erro busca YouTube:', e.message);
        }
      }

      // Fallback: scrape do YouTube
      if (!videoId) {
        try {
          const urlScrape = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          const resScrape = await axios.get(urlScrape, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          const match = resScrape.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (match) {
            videoId = match[1];
            const titleMatch = resScrape.data.match(/"title":{"runs":\[{"text":"([^"]+)"/);
            if (titleMatch) titulo = titleMatch[1];
          }
        } catch (e) {}
      }

      if (!videoId) {
        return reply(`⚠️ Não encontrei "${query}"`);
      }

      await reply(`🎵 ${titulo}\n⏳ Baixando...`);

      const urlVideo = `https://www.youtube.com/watch?v=${videoId}`;
      
      // 2. Usar Cobalt API para obter URL de download direto
      const cobaltUrls = [
        'https://api.cobalt.tools/api/json',
        'https://coapi.me/api/json',
        'https://api.cobalt.media/api/json'
      ];
      
      let downloadUrl = null;
      let downloadFilename = null;
      
      for (const cobaltUrl of cobaltUrls) {
        try {
          const res = await axios.post(cobaltUrl, {
            url: urlVideo,
            audioFormat: 'mp3',
            isAudioOnly: true,
            filenameStyle: 'pretty'
          }, {
            timeout: 60000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            }
          });
          
          if (res.data?.url) {
            downloadUrl = res.data.url;
            downloadFilename = res.data.filename || `${titulo}.mp3`;
            break;
          }
        } catch (e) {
          console.log(`[musica] Cobalt ${cobaltUrl} falhou:`, e.message);
          continue;
        }
      }
      
      // 3. Fallback: usar savevid.io se Cobalt falhar
      if (!downloadUrl) {
        try {
          const saveVidRes = await axios.post('https://api.savevid.io/v1/fetch', {
            url: urlVideo
          }, {
            timeout: 60000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (saveVidRes.data?.downloads?.mp3) {
            downloadUrl = saveVidRes.data.downloads.mp3.url;
            downloadFilename = `${titulo}.mp3`;
          }
        } catch (e) {
          console.log('[musica] Savevid falhou:', e.message);
        }
      }
      
      // 4. Fallback final: tentar ytdl-core diretamente
      if (!downloadUrl) {
        try {
          const ytdl = require('@distube/ytdl-core');
          const info = await ytdl.getInfo(urlVideo);
          
          const formatos = info.formats.filter(f => 
            f.hasAudio && !f.hasVideo && f.contentLength && 
            parseInt(f.contentLength) < 15 * 1024 * 1024
          );
          
          if (formatos.length > 0) {
            const melhor = formatos.sort((a, b) => 
              parseInt(b.contentLength || 0) - parseInt(a.contentLength || 0)
            )[0];
            
            if (melhor?.url) {
              downloadUrl = melhor.url;
              downloadFilename = `${titulo}.mp3`;
            }
          }
        } catch (e) {
          console.log('[musica] ytdl-core falhou:', e.message);
        }
      }
      
      if (!downloadUrl) {
        return reply('⚠️ Não foi possível baixar. O YouTube está limitando requisições. Tente em alguns minutos ou use outro termo.');
      }

      // 5. Baixar o áudio
      const downloadRes = await axios.get(downloadUrl, {
        responseType: 'stream',
        timeout: 120000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.youtube.com/'
        },
        maxRedirects: 5
      });

      const writer = fs.createWriteStream(caminhoArquivo);
      
      let totalSize = 0;
      downloadRes.data.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > 16 * 1024 * 1024) {
          downloadRes.data.destroy();
          writer.destroy();
        }
      });
      
      downloadRes.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        downloadRes.data.on('error', reject);
      });

      // 6. Validar e enviar
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
        fileName: downloadFilename || `${titulo}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      try { fs.unlinkSync(caminhoArquivo); } catch (e) {}
      
      if (err.message.includes('429')) {
        return reply('⚠️ YouTube limitou. Tente em 5-10 min.');
      }
      
      return reply('⚠️ Erro ao baixar música. Tente novamente.');
    }
  }
};
