const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'historicomembro',
  aliases: ['hismembro', 'histmembro'],
  adminOnly: true,

  async execute({ groupId, args, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const membros = config.membros || [];

    if (membros.length === 0) {
      return reply('📭 Nenhum registro de membros encontrado ainda.\nO bot começou a registrar agora!');
    }

    // Filtra por membro específico se fornecido
    let registros = membros;
    let membroInfo = '';
    
    if (args.length > 0) {
      const numeroAlvo = args[0].replace(/[^0-9]/g, '');
      if (!numeroAlvo) return reply('⚠️ Use: #historicomembro [número] ou #historicomembro');
      
      registros = membros.filter(m => m.membroId.includes(numeroAlvo));
      membroInfo = ` do número ${numeroAlvo}`;
      
      if (registros.length === 0) {
        return reply(`📭 Nenhum registro encontrado para o número ${numeroAlvo}.`);
      }
    }

    // Ordena por timestamp (mais recente primeiro)
    const recentes = [...registros]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15);

    let texto = `📜 *Histórico de Membros${membroInfo}:*\n\n`;
    
    recentes.forEach(registro => {
      const data = new Date(registro.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const acao = registro.acao === 'add' ? '🟢 ENTROU' : '🔴 SAIU';
      texto += `${acao} — ${registro.nome || 'Desconhecido'} (${registro.membroId.split('@')[0]})\n   📅 ${data}\n\n`;
    });

    texto += `\n📊 Total de registros: ${membros.length}`;

    return reply(texto.trim());
  }
};
