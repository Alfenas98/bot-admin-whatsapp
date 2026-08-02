const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antifloodfigurinha',
  aliases: ['limitefigurinhas'],
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'antifloodFigurinha.ativo', opcao === 'on');
      return reply(`📢 Anti-flood de figurinhas ${opcao === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }

    if (opcao === 'limite') {
      const numero = parseInt(args[1], 10);
      if (!numero || numero < 1) return reply('Uso: #antifloodfigurinha limite <número>');
      setGroupConfig(groupId, 'antifloodFigurinha.limite', numero);
      return reply(`✅ Limite de figurinhas ajustado pra ${numero}.`);
    }

    if (opcao === 'tempo') {
      const segundos = parseInt(args[1], 10);
      if (!segundos || segundos < 1) return reply('Uso: #antifloodfigurinha tempo <segundos>');
      setGroupConfig(groupId, 'antifloodFigurinha.tempoSegundos', segundos);
      return reply(`✅ Janela de tempo ajustada pra ${segundos}s.`);
    }

    return reply(
      `Uso: #antifloodfigurinha on|off\n#antifloodfigurinha limite <número>\n#antifloodfigurinha tempo <segundos>\n\nAtual: ${config.antifloodFigurinha.limite} figurinhas / ${config.antifloodFigurinha.tempoSegundos}s`
    );
  }
};
