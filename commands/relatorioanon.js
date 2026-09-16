const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'relatorioanon',
  aliases: ['relpanon', 'anonstats'],
  adminOnly: true,

  async execute({ groupId, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const historico = config.caixaAnonima?.historico || [];

    if (historico.length === 0) {
      return reply('📭 Nenhuma mensagem anônima registrada ainda.');
    }

    const total = historico.length;
    const primeiraData = new Date(historico[0].timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const ultimaData = new Date(historico[total - 1].timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Contar por remetente
    const contagem = {};
    historico.forEach(h => {
      contagem[h.remetente] = (contagem[h.remetente] || 0) + 1;
    });

    // Top 5 remetentes
    const topRemetentes = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, qtd]) => `• ${nome}: ${qtd} mensagem(ns)`)
      .join('\n');

    const relatorio = `📊 *Relatório da Caixa Anônima*

📈 Total de mensagens: ${total}
📅 Primeira mensagem: ${primeiraData}
📅 Última mensagem: ${ultimaData}

👤 *Top 5 remetentes:*
${topRemetentes}`;

    return reply(relatorio);
  }
};
