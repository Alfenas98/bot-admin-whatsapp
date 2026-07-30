const { db } = require('../lib/database');
module.exports = {
  name: 'top10',
  aliases: ['ranking'],
  adminOnly: false,
  async execute({ groupId, reply }) {
    const usuarios = db.get(['users', groupId]).value() || {};

    const lista = Object.entries(usuarios)
      .filter(([, dados]) => dados.mensagens > 0)
      .sort((a, b) => (b[1].nivel || 1) - (a[1].nivel || 1) || (b[1].xp || 0) - (a[1].xp || 0))
      .slice(0, 10);

    if (lista.length === 0) {
      return reply('Ainda não há dados suficientes pro ranking. Ative #levelsystem on e mande mensagens.');
    }

    const texto = lista
      .map(([id, dados], i) => `${i + 1}. @${id.split('@')[0]} — nível ${dados.nivel || 1} (${dados.mensagens} msgs)`)
      .join('\n');

    return reply(`🏆 *Top 10 do grupo*\n${texto}`);
  }
};
