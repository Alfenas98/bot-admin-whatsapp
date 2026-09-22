const CRON_HORARIOS = ['12:00', '23:59'];

function iniciarCronTop10(sock) {
  console.log('[cron] Top 10 automático configurado para:', CRON_HORARIOS.join(', '));
  
  const xp = require('./xp');
  const { db } = require('./database');
  
  const getPatente = xp.getPatente;
  const getTopUsuarios = xp.getTopUsuarios;
  
  setInterval(async () => {
    const agora = new Date();
    const horaAtual = agora.toTimeString().slice(0, 5);
    
    if (!CRON_HORARIOS.includes(horaAtual)) return;
    
    console.log(`[cron] Executando Top 10 automático - ${horaAtual}`);
    
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
          const id = usuario.id;
          
          // Buscar nome: primeiro no banco
          const { buscarNomeUsuario, formatarIdUsuario } = require('./userUtils');
          let nome = await buscarNomeUsuario(sock, groupId, id, null);
          
          // Fallback
          if (!nome) {
            nome = formatarIdUsuario(id);
          }
          
          mencoes.push(id);
          texto += `${i + 1}. ${nome} - ${getPatente(usuario.nivel)} (Nv ${usuario.nivel}, ${usuario.mensagens} msgs)\n`;
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

module.exports = { iniciarCronTop10, CRON_HORARIOS };
