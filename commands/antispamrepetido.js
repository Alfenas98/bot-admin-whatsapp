const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'antispamrepetido',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'antispamRepetido.ativo', opcao === 'on');
      return reply(`🔁 Anti-spam de mensagem repetida ${opcao === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }

    if (opcao === 'limite') {
      const numero = parseInt(args[1], 10);
      if (!numero || numero < 2) return reply('Uso: #antispamrepetido limite <número> (mínimo 2)');
      setGroupConfig(groupId, 'antispamRepetido.limite', numero);
      return reply(`✅ Limite ajustado pra ${numero} repetições seguidas.`);
    }

    return reply(`Uso: #antispamrepetido on|off\n#antispamrepetido limite <número>\n\nAtual: ${config.antispamRepetido.limite}x seguidas`);
  }
};
