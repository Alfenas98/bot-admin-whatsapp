const fs = require('fs');
const path = require('path');
const { storageDir } = require('../lib/storage');

module.exports = {
  name: 'limparsalvas',
  adminOnly: true,
  async execute({ reply }) {
    const mediaSaveDir = path.join(storageDir, 'midias_salvas');
    if (!fs.existsSync(mediaSaveDir)) {
      return reply('📁 Nenhuma mídia salva.');
    }

    const arquivos = fs.readdirSync(mediaSaveDir);
    if (arquivos.length === 0) {
      return reply('📁 Nenhuma mídia salva.');
    }

    try {
      fs.rmSync(mediaSaveDir, { recursive: true, force: true });
      fs.mkdirSync(mediaSaveDir, { recursive: true });
      reply(`✅ ${arquivos.length} mídia(s) removida(s) com sucesso.`);
    } catch (err) {
      reply('⚠️ Erro ao limpar mídias.');
    }
  }
};
