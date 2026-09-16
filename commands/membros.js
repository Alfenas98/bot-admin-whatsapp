const { getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'membros',
  aliases: ['totalmembros', 'contagem'],
  adminOnly: false,

  async execute({ sock, groupId, reply, getGroupConfig }) {
    const config = getGroupConfig(groupId);
    const membros = config.membros || [];
    
    // Obter contagem atual de membros no grupo
    let totalAtual = 0;
    let admins = 0;
    try {
      const metadata = await sock.groupMetadata(groupId);
      totalAtual = metadata.participants?.length || 0;
      admins = metadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
    } catch (err) {
      console.error('[membros] Erro ao obter metadata:', err.message);
    }

    // Estatísticas do histórico
    const totalRegistros = membros.length;
    const entraram = membros.filter(m => m.acao === 'add').length;
    const sairam = membros.filter(m => m.acao === 'remove').length;

    // Últimos 7 dias
    const agora = Date.now();
    const dias7 = agora - (7 * 24 * 60 * 60 * 1000);
    const semana = membros.filter(m => m.timestamp > dias7);
    const entraramSemana = semana.filter(m => m.acao === 'add').length;
    const sairamSemana = semana.filter(m => m.acao === 'remove').length;

    const texto = `📊 *Estatísticas do Grupo*

👥 Total atual: ${totalAtual} membros
👑 Admins: ${admins}

📈 Desde o início:
   • Entraram: ${entraram}
   • Saíram: ${sairam}
   • Líquido: ${entraram - sairam > 0 ? '+' : ''}${entraram - sairam}

📅 Últimos 7 dias:
   • Entraram: ${entraramSemana}
   • Saíram: ${sairamSemana}
   • Líquido: ${entraramSemana - sairamSemana > 0 ? '+' : ''}${entraramSemana - sairamSemana}

📜 Registros no banco: ${totalRegistros}/500`;

    return reply(texto);
  }
};
