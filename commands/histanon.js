const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'histanon',
  aliases: ['histanonimo', 'hiscaixa'],
  adminOnly: true,

  async execute({ groupId, args, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const historico = config.caixaAnonima?.historico || [];

    if (historico.length === 0) {
      return reply('📭 Histórico de mensagens anônimas está vazio.');
    }

    const limite = parseInt(args[0]) || 10;
    const ultimas = historico.slice(-limite);

    let texto = `📬 *Histórico Anônimo (últimas ${ultimas.length}):*\n\n`;
    ultimas.forEach((item, i) => {
      const data = new Date(item.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      texto += `${i + 1}. [${data}] De: ${item.remetente}\n   "${item.mensagem}"\n\n`;
    });

    return reply(texto.trim());
  }
};
