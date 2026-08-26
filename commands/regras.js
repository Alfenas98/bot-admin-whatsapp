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

    const partes = [];
    let atual = '';

    for (const linha of regras.split('\n')) {
      const candidato = atual ? atual + '\n' + linha : linha;

      if (candidato.length > LIMITE && atual) {
        partes.push(atual.trim());
        atual = linha;
      } else {
        atual = candidato;
      }
    }

    if (atual.trim()) partes.push(atual.trim());

    for (const parte of partes) {
      await reply(parte);
    }
  }
};