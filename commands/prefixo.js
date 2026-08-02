const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'prefixo',
  aliases: ['multiprefixo'],
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (acao === 'add' && args[1]) {
      const novo = args[1];
      const lista = new Set(config.prefixos);
      lista.add(novo);
      setGroupConfig(groupId, 'prefixos', [...lista]);
      return reply(`➕ Prefixo "${novo}" adicionado. Prefixos ativos: ${[...lista].join(' ')}`);
    }

    if (acao === 'remover' && args[1]) {
      const lista = config.prefixos.filter(p => p !== args[1]);
      if (lista.length === 0) return reply('❌ Não é possível remover o último prefixo restante.');
      setGroupConfig(groupId, 'prefixos', lista);
      return reply(`➖ Prefixo "${args[1]}" removido. Prefixos ativos: ${lista.join(' ')}`);
    }

    return reply(`Prefixos ativos: ${config.prefixos.join(' ')}\nUso: #prefixo add <símbolo> | #prefixo remover <símbolo>`);
  }
};
