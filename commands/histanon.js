const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'histanon',
  aliases: ['histanonimo', 'hiscaixa'],
  adminOnly: true,

  async execute({ sock, groupId, args, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const historico = config.caixaAnonima?.historico || [];

    if (historico.length === 0) {
      return reply('📭 Histórico de mensagens anônimas está vazio.');
    }

    // Obter nomes dos participantes
    let metadata;
    try {
      metadata = await sock.groupMetadata(groupId);
    } catch (e) {}

    const participantesMap = {};
    if (metadata?.participants) {
      for (const p of metadata.participants) {
        participantesMap[p.id] = p.pushName || p.name || p.id.split('@')[0];
        participantesMap[p.id.replace('@s.whatsapp.net', '')] = p.pushName || p.name || p.id.split('@')[0];
      }
    }

    const limite = parseInt(args[0]) || 10;
    const ultimas = historico.slice(-limite);

    let texto = `📬 *Histórico Anônimo (últimas ${ultimas.length}):*\n\n`;
    ultimas.forEach((item, i) => {
      const data = new Date(item.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const nomeRemetente = participantesMap[item.remetente] || participantesMap[item.remetente?.replace('@s.whatsapp.net', '')] || item.remetente;
      texto += `${i + 1}. [${data}] De: ${nomeRemetente}\n   "${item.mensagem}"\n\n`;
    });

    return reply(texto.trim());
  }
};
