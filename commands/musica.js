const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

async function baixar(query) {
  const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const destino = path.join(DOWNLOAD_DIR, nomeArquivo);
  
  const comandos = [
    // yt-dlp do pip
    `python3 -m ytdlp --extract-audio --audio-format mp3 --audio-quality 3 --max-filesize 15M --no-playlist --no-warnings --output "${destino}.mp3" "ytsearch1:${query}"`,
    // yt-dlp binário
    `yt-dlp --extract-audio --audio-format mp3 --audio-quality 3 --max-filesize 15M --no-playlist --no-warnings --output "${destino}.mp3" "ytsearch1:${query}"`,
    // Caminho alternativo
    `/usr/local/bin/yt-dlp --extract-audio --audio-format mp3 --audio-quality 3 --max-filesize 15M --no-playlist --no-warnings --output "${destino}.mp3" "ytsearch1:${query}"`,
  ];
  
  for (const cmd of comandos) {
    try {
      await new Promise((resolve, reject) => {
        exec(cmd, { timeout: 120000, cwd: DOWNLOAD_DIR }, (error, stdout, stderr) => {
          if (error) {
            console.log('[musica] Comando falhou:', cmd.split(' ')[0], stderr?.slice(0, 200));
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      const arquivo = `${destino}.mp3`;
      if (fs.existsSync(arquivo)) {
        const stats = fs.statSync(arquivo);
        if (stats.size > 10000) {
          return arquivo;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

module.exports = {
  name: 'musica',
  aliases: ['music', 'song', 'tocar'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    const query = args.join(' ');
    if (!query) return reply('🎵 Use: #musica <nome da música>');

    limparAntigos();

    try {
      await reply('🎵 Buscando e baixando...');

      const destino = await baixar(query);
      
      if (!destino) {
        return reply('⚠️ YouTube está bloqueando. Tente outro termo ou aguarde alguns minutos.');
      }

      const stats = fs.statSync(destino);
      if (stats.size > 16 * 1024 * 1024) {
        fs.unlinkSync(destino);
        return reply('⚠️ Áudio muito grande!');
      }

      await sock.sendMessage(groupId, {
        audio: fs.readFileSync(destino),
        mimetype: 'audio/mpeg',
        fileName: `${query}.mp3`,
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(destino); } catch (e) {}

    } catch (err) {
      console.error('[musica] Erro:', err.message);
      return reply('⚠️ Erro ao baixar. Tente novamente.');
    }
  }
};
