const fs = require('fs');
const path = require('path');
const { storageDir } = require('../lib/storage');

module.exports = {
  name: 'vermidia',
  adminOnly: true,
  aliases: ['vermidias', 'ver'],
  async execute({ sock, groupId, args, reply }) {
    const mediaSaveDir = path.join(storageDir, 'midias_salvas');
    if (!fs.existsSync(mediaSaveDir)) {
      return reply('📁 Nenhuma mídia salva ainda.');
    }

    const arquivos = fs.readdirSync(mediaSaveDir);
    if (arquivos.length === 0) {
      return reply('📁 Nenhuma mídia salva ainda.');
    }

    // Sem argumentos: lista as últimas 10 mídias
    if (!args[0]) {
      const lista = arquivos.slice(-10).reverse().map((nome, i) => `${i + 1}. ${nome}`).join('\n');
      return reply(`📁 Mídias salvas (últimas 10):\n\n${lista}\n\nTotal: ${arquivos.length} arquivos\n\nUse #vermidia <numero> para baixar uma mídia.`);
    }

    // Com argumento: baixa/reenvia a mídia
    const indice = parseInt(args[0], 10) - 1;
    const arquivosOrdenados = arquivos.slice().reverse();

    if (isNaN(indice) || indice < 0 || indice >= arquivosOrdenados.length) {
      return reply('⚠️ Número inválido. Use #vermidia para ver a lista.');
    }

    const nomeArquivo = arquivosOrdenados[indice];
    const caminho = path.join(mediaSaveDir, nomeArquivo);

    if (!fs.existsSync(caminho)) {
      return reply('⚠️ Arquivo não encontrado.');
    }

    try {
      const buffer = fs.readFileSync(caminho);
      const ext = path.extname(nomeArquivo).toLowerCase();

      if (ext === '.jpg' || ext === '.jpeg') {
        await sock.sendMessage(groupId, { image: buffer }, { quoted: undefined });
      } else if (ext === '.mp4') {
        await sock.sendMessage(groupId, { video: buffer }, { quoted: undefined });
      } else if (ext === '.ogg') {
        await sock.sendMessage(groupId, { audio: buffer, mimetype: 'audio/ogg' }, { quoted: undefined });
      } else if (ext === '.webp') {
        await sock.sendMessage(groupId, { sticker: buffer }, { quoted: undefined });
      } else {
        await sock.sendMessage(groupId, { document: buffer, mimetype: 'application/octet-stream', fileName: nomeArquivo }, { quoted: undefined });
      }

      reply(`✅ Mídia reenviada: ${nomeArquivo}`);
    } catch (err) {
      console.error('[vermidia] Falha ao reenviar:', err.message);
      reply('⚠️ Erro ao reenviar mídia.');
    }
  }
};
