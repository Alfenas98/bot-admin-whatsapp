const fs = require('fs');
const path = require('path');
const { storageDir } = require('../lib/storage');

module.exports = {
  name: 'midiasalv',
  adminOnly: true,
  aliases: ['midiassalvas', 'midiass'],
  async execute({ reply }) {
    const mediaSaveDir = path.join(storageDir, 'midias_salvas');
    if (!fs.existsSync(mediaSaveDir)) {
      return reply('📁 Nenhuma mídia salva ainda.');
    }

    const arquivos = fs.readdirSync(mediaSaveDir);
    if (arquivos.length === 0) {
      return reply('📁 Nenhuma mídia salva ainda.');
    }

    const lista = arquivos.slice(-10).map((nome, i) => `${i + 1}. ${nome}`).join('\n');
    reply(`📁 Mídias salvas (últimas 10):\n\n${lista}\n\nTotal: ${arquivos.length} arquivos\n\nUse #vermidia <numero> para baixar uma mídia.`);
  }
};
