const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'limitecaracteres',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'on' || opcao === 'off') {
      setGroupConfig(groupId, 'limiteCaracteres.ativo', opcao === 'on');
      return reply(`🔢 Limite de caracteres ${opcao === 'on' ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }

    const numero = parseInt(opcao, 10);
    if (numero && numero > 0) {
      setGroupConfig(groupId, 'limiteCaracteres.limite', numero);
      return reply(`✅ Limite ajustado pra ${numero} caracteres.`);
    }

    return reply(`Uso: #limitecaracteres on|off\n#limitecaracteres <número>\n\nAtual: ${config.limiteCaracteres.limite} caracteres`);
  }
};
