const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function getMediaSaveDir(storageDir) {
  const mediaSaveDir = path.join(storageDir, 'midias_salvas');
  if (!fs.existsSync(mediaSaveDir)) fs.mkdirSync(mediaSaveDir, { recursive: true });
  return mediaSaveDir;
}

async function salvarMidia(msg, storageDir) {
  try {
    const m = msg.message || {};
    const media =
      m.imageMessage ||
      m.videoMessage ||
      m.audioMessage ||
      m.stickerMessage ||
      m.documentMessage ||
      null;
    if (!media) return null;

    const extMap = {
      imageMessage: 'jpg',
      videoMessage: 'mp4',
      audioMessage: 'ogg',
      stickerMessage: 'webp',
      documentMessage: 'bin'
    };
    const tipo = Object.keys(extMap).find(key => m[key] && m[key] === media) || 'documentMessage';
    const ext = extMap[tipo] || 'bin';
    const nome = `${Date.now()}-${msg.key.participant?.split('@')[0] || 'bot'}.${ext}`;
    const mediaSaveDir = getMediaSaveDir(storageDir);
    const caminho = path.join(mediaSaveDir, nome);

    const buffer = await downloadMediaMessage(msg, 'buffer', {});
    fs.writeFileSync(caminho, buffer);

    return caminho;
  } catch (err) {
    console.error('[midia-salva] Falha ao salvar:', err.message);
    return null;
  }
}

function listarMidiasSalvas(storageDir) {
  const mediaSaveDir = getMediaSaveDir(storageDir);
  if (!fs.existsSync(mediaSaveDir)) return [];
  return fs.readdirSync(mediaSaveDir).map((nome) => ({
    nome,
    caminho: path.join(mediaSaveDir, nome),
    tamanho: fs.statSync(path.join(mediaSaveDir, nome)).size
  }));
}

module.exports = { salvarMidia, listarMidiasSalvas, getMediaSaveDir };
