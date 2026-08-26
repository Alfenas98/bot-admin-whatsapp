const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'regras',
  adminOnly: false,
  async execute({ groupId, reply }) {
    const config = getGroupConfig(groupId);
    const regras = config.regras;

    if (!regras) {
      return reply('📋 Nenhuma regra cadastrada para este grupo.\nUm admin pode usar #addregras para definir.');
    }

    const LIMITE = 3500;
    if (regras.length <= LIMITE) {
      return reply(regras);
    }

    const linhas = regras.split('\n');
    const partes = [];
    let atual = '';

    for (const linha of linhas) {
      if ((atual + '\n' + linha).length > LIMITE && atual) {
        partes.push(atual.trim());
        atual = '';
      }
      atual += (atual ? '\n' : '') + linha;
    }

    if (atual.trim()) partes.push(atual.trim());

    for (const parte of partes) {
      await reply(parte);
    }
  }
};