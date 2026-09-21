/**
 * Cron Job para Top 10 Diário
 * 
 * Envia automaticamente o ranking nos grupos que tiverem levelSystem ativado
 * - 12:00 (meio-dia)
 * - 23:59 (fim do dia)
 */

const CRON_HORARIOS = ['12:00', '23:59'];
const { getPatente } = require('./xp');

function iniciarCronTop10(sock) {
  console.log('[cron] Top 10 automático configurado para:', CRON_HORARIOS.join(', '));
  
  // Verificar a cada minuto
  setInterval(async () => {
    const agora = new Date();
    const horaAtual = agora.toTimeString().slice(0, 5); // HH:MM
    
    // Verificar se é um dos horários configurados
    if (!CRON_HORARIOS.includes(horaAtual)) return;
    
    console.log(`[cron] Executando Top 10 automático - ${horaAtual}`);
    
    try {
      const { db } = require('./database');
      const grupos = db.get('groups').value() || {};
      
      for (const [groupId, config] of Object.entries(grupos)) {
        // Verificar se levelSystem está ativo
        if (!config.levelSystem) continue;
        
        // Verificar se o grupo tem usuários
        const usuarios = db.get(['users', groupId]).value();
        if (!usuarios || typeof usuarios !== 'object') continue;
        
        const { getTopUsuarios } = require('./xp');
        const top10 = getTopUsuarios(groupId, 10);
        
        if (top10.length === 0) continue;
        
        // Buscar metadata
        let metadata;
        try {
          metadata = await sock.groupMetadata(groupId);
        } catch (e) {
          continue;
        }
        
        const participantes = {};
        if (metadata?.participants) {
          for (const p of metadata.participants) {
            if (p?.id) {
              const numero = p.id.split('@')[0].split(':')[0];
              participantes[numero] = p.pushName || p.id.split('@')[0];
            }
          }
        }
        
        // Montar texto
        let texto = '';
        const mencoes = [];
        
        for (let i = 0; i < top10.length; i++) {
          const usuario = top10[i];
          const id = usuario.id;
          const numero = String(id).split('@')[0].split(':')[0];
          const nome = participantes[numero] || numero;
          const patente = getPatente(usuario.nivel);
          
          mencoes.push(`${numero}@s.whatsapp.net`);
          texto += `${i + 1}. @${numero} - ${patente} (Nv ${usuario.nivel}, ${usuario.mensagens} msgs)\n`;
        }
        
        // Enviar
        try {
          await sock.sendMessage(groupId, {
            text: `🏆 *Top 10 do Dia - ${horaAtual === '12:00' ? 'Meio-dia' : 'Fim de dia'}*\n\n${texto}`,
            mentions: mencoes
          });
          
          console.log(`[cron] Top 10 enviado para ${groupId}`);
        } catch (e) {
          console.error(`[cron] Erro ao enviar para ${groupId}:`, e.message);
        }
        
        // Delay entre grupos
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error('[cron] Erro geral:', e.message);
    }
  }, 60000); // Verificar a cada minuto
}

module.exports = { iniciarCronTop10, CRON_HORARIOS };