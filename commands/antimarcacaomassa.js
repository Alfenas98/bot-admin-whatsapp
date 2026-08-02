const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antimarcacaomassa',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'antimarcacaomassa.ativo', opcao === 'on');
      return reply(`📛 Anti-marcação em massa ${opcao === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }

    if (opcao === 'limite') {
      const numero = parseInt(args[1], 10);
      if (!numero || numero < 1) return reply('Uso: #antimarcacaomassa limite <número>');
      setGroupConfig(groupId, 'antimarcacaomassa.limite', numero);
      return reply(`✅ Limite ajustado pra ${numero} marcações por mensagem.`);
    }

    return reply(`Uso: #antimarcacaomassa on|off\n#antimarcacaomassa limite <número>\n\nAtual: ${config.antimarcacaomassa.limite} menções`);
  }
};
