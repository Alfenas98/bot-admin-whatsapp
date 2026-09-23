/**
 * Cron Job para Top 10 Diário
 * Horários de Brasília (GMT-3)
 */

const CRON_HORARIOS = ['12:00', '23:59'];
const BRASILIA_OFFSET = -3; // GMT-3

/**
 * Obter horário atual de Brasília
 */
function getHorarioBrasilia() {
  const agora = new Date();
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasilia = new Date(utc + BRASILIA_OFFSET * 3600000);
  
  const hora = brasilia.getHours().toString().padStart(2, '0');
  const minutos = brasilia.getMinutes().toString().padStart(2, '0');
  
  return { hora, minutos, horaAtual: `${hora}:${minutos}` };
}

function iniciarCronTop10(sock) {
  console.log('[cron] Top 10 automático - Horário de Brasília (GMT-3):', CRON_HORARIOS.join(', '));
  
  const xp = require('./xp');
  const { db } = require('./database');
  
  const getPatente = xp.getPatente;
  const getTopUsuarios = xp.getTopUsuarios;
  
  setInterval(async () => {
    const { horaAtual } = getHorarioBrasilia();
    
    if (!CRON_HORARIOS.includes(horaAtual)) return;
    
    console.log(`[cron] Executando Top 10 - ${horaAtual} (Brasília)`);
    
    try {
      const grupos = db.get('groups').value() || {};
      
      for (const [groupId, config] of Object.entries(grupos)) {
        if (!config.levelSystem) continue;
        
        const usuarios = db.get(['users', groupId]).value();
        if (!usuarios || typeof usuarios !== 'object') continue;
        
        const top10 = getTopUsuarios(groupId, 10);
        if (top10.length === 0) continue;
        
        let texto = '';
        const mencoes = [];
        
        for (let i = 0; i < top10.length; i++) {
          const usuario = top10[i];
          const displayNome = usuario.nome || usuario.id.split('@')[0];
          
          const idReal = await buscarIdReal(sock, groupId, usuario.id);
          mencoes.push(idReal);
          
          texto += `${i + 1}. @${displayNome} - ${getPatente(usuario.nivel)} (Nv ${usuario.nivel}, ${usuario.mensagens} msgs)\n`;
        }
        
        try {
          await sock.sendMessage(groupId, {
            text: `🏆 *Top 10 do Dia - ${horaAtual === '12:00' ? 'Meio-dia' : 'Fim de dia'}*\n\n${texto}`,
            mentions: mencoes
          });
          console.log(`[cron] Top 10 enviado para ${groupId}`);
        } catch (e) {
          console.error(`[cron] Erro ao enviar para ${groupId}:`, e.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error('[cron] Erro geral:', e.message);
    }
  }, 60000);
}

module.exports = { iniciarCronTop10, CRON_HORARIOS, getHorarioBrasilia };
