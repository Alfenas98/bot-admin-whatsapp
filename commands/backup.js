const fs = require('fs');
const path = require('path');
const { storageDir } = require('../lib/storage');

module.exports = {
  name: 'backup',
  adminOnly: true,
  async execute({ sock, groupId, reply }) {
    const dbPath = path.join(storageDir, 'database', 'db.json');
    if (!fs.existsSync(dbPath)) return reply('Nenhum dado salvo ainda.');

    try {
      const buffer = fs.readFileSync(dbPath);
      await sock.sendMessage(groupId, {
        document: buffer,
        fileName: `backup-${Date.now()}.json`,
        mimetype: 'application/json',
        caption: '💾 Backup das configurações e dados do bot (guarde em local seguro).'
      });
    } catch (err) {
      return reply('⚠️ Não consegui gerar o backup.');
    }
  }
};
