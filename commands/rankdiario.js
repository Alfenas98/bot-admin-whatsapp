const { getRankDiario } = require('../lib/dailyRank');

module.exports = {
  name: 'rankdiario',
  aliases: ['topdiario', 'rankhoje'],
  adminOnly: false,
  async execute({ groupId, reply }) {
    const lista = getRankDiario(groupId);

    if (lista.length === 0) {
      return reply('Ainda ninguém mandou mensagem hoje (ou o dia acabou de começar). O ranking reseta toda meia-noite.');
    }

    const texto = lista
      .map(([id, dados], i) => `${i + 1}. @${id.split('@')[0]} — ${dados.diario.mensagens} mensagem(ns) hoje`)
      .join('\n');

    return reply(`📅 *Ranking de hoje*\n${texto}\n\n_Reseta à meia-noite._`);
  }
};
