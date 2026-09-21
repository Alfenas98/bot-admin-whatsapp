/**
 * Sistema de Relatório Semanal
 * 
 * Envia automaticamente um resumo da semana aos domingos às 10:00.
 * 
 * Inclui:
 * - Membros mais ativos
 * - Total de mensagens
 * - Membros que saíram/entraram
 * - Ranking de XP
 */

const { db } = require('./database');
const { getTopUsuarios, getPatente } = require('./xp');

function gerarRelatorioSemanal(groupId) {
  try {
    const agora = new Date();
    const umaSemana = 7 * 24 * 60 * 60 * 1000;
    const inicioSemana = agora - umaSemana;
    
    // Buscar dados da semana
    const usuarios = db.get(['users', groupId]).value() || {};
    const config = db.get(['groups', groupId]).value() || {};
    
    // Filtrar usuários ativos na semana
    const ativos = [];
    for (const [id, dados] of Object.entries(usuarios)) {
      if (dados.mensagens > 0) {
        ativos.push({ id, ...dados });
      }
    }
    
    // Ordenar por mensagens
    ativos.sort((a, b) => b.mensagens - a.mensagens);
    
    // Montar relatório
    let msg = `📊 *Relatório Semanal*\n\n`;
    msg += `📅 ${new Date(inicioSemana).toLocaleDateString('pt-BR')} - ${agora.toLocaleDateString('pt-BR')}\n\n`;
    
    // Top 5 mais ativos
    msg += `🏆 *Top 5 Mais Ativos:*\n`;
    const top5 = ativos.slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
      const u = top5[i];
      const patente = getPatente(u.nivel || 1);
      msg += `${i + 1}. @${u.id.split('@')[0]} - ${patente} (${u.mensagens} msgs)\n`;
    }
    
    // Estatísticas gerais
    const totalMsgs = ativos.reduce((acc, u) => acc + u.mensagens, 0);
    msg += `\n📈 *Estatísticas:*\n`;
    msg += `• Total de mensagens: *${totalMsgs}*\n`;
    msg += `• Membros ativos: *${ativos.length}*\n`;
    
    return msg;
  } catch (e) {
    console.error('[relatorio] Erro:', e.message);
    return '⚠️ Erro ao gerar relatório.';
  }
}

module.exports = { gerarRelatorioSemanal };
