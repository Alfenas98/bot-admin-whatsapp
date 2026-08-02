const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'palavrao',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (acao === 'add' && args[1]) {
      const palavra = args[1].toLowerCase();
      const lista = new Set(config.palavroes);
      lista.add(palavra);
      setGroupConfig(groupId, 'palavroes', [...lista]);
      return reply(`➕ "${palavra}" adicionada à lista de palavrões.`);
    }

    if (acao === 'remover' && args[1]) {
      const palavra = args[1].toLowerCase();
      const lista = config.palavroes.filter(p => p !== palavra);
      setGroupConfig(groupId, 'palavroes', lista);
      return reply(`➖ "${palavra}" removida da lista.`);
    }

    if (acao === 'lista') {
      return reply(`Palavras bloqueadas: ${config.palavroes.join(', ') || '(nenhuma)'}`);
    }

    return reply('Uso: #palavrao add <palavra> | #palavrao remover <palavra> | #palavrao lista\n(Lembre de ativar com #antipalavrao)');
  }
};
