const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function getMediaSaveDir(storageDir) {
  const mediaSaveDir = path.join(storageDir, 'midias_salvas');
  if (!fs.existsSync(mediaSaveDir)) fs.mkdirSync(mediaSaveDir, { recursive: true });
  return mediaSaveDir;
}

function extrairMidia(msg) {
  const m = msg.message || {};
  const tipos = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'stickerMessage',
    'documentMessage'
  ];

  for (const tipo of tipos) {
    if (m[tipo]) return { tipo, media: m[tipo] };
  }

  const viewOnce = m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension;
  if (viewOnce) {
    const inner = viewOnce.message || {};
    for (const tipo of tipos) {
      if (inner[tipo]) return { tipo, media: inner[tipo], viewOnce: true };
    }
  }

  return null;
}

async function salvarMidia(msg, storageDir) {
  try {
    const extraida = extrairMidia(msg);
    if (!extraida) return null;

    const { tipo, media, viewOnce } = extraida;
    const extMap = {
      imageMessage: 'jpg',
      videoMessage: 'mp4',
      audioMessage: 'ogg',
      stickerMessage: 'webp',
      documentMessage: 'bin'
    };
    const ext = extMap[tipo] || 'bin';
    const nome = `${Date.now()}-${msg.key.participant?.split('@')[0] || 'bot'}${viewOnce ? '-viewonce' : ''}.${ext}`;
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

module.exports = { salvarMidia, listarMidiasSalvas, getMediaSaveDir, extrairMidia };
