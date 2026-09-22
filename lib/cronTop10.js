/**
 * Cron Job para Top 10 Diário
 * 
 * Envia ranking diário às 12:00 e 23:59
 */

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
        
        let metadata;
        try {
          metadata = await sock.groupMetadata(groupId);
        } catch (e) {
          continue;
        }
        
        // Criar mapa de participantes (ID -> nome)
        const participantes = {};
        if (metadata?.participants) {
          for (const p of metadata.participants) {
            if (p?.id) {
              participantes[p.id] = p.pushName || p.id.split('@')[0];
            }
          }
        }
        
        let texto = '';
        const mencoes = [];
        
        for (let i = 0; i < top10.length; i++) {
          const usuario = top10[i];
          const id = usuario.id;
          
          // Tentar encontrar o nome do usuário
          let nome = participantes[id];
          
          // Se não encontrou pelo ID completo, tentar pelo número
          if (!nome) {
            const numeroBase = String(id).split('@')[0].split(':')[0];
            // Buscar qualquer participante que comece com esse número
            const encontrado = Object.entries(participantes).find(([jid, _]) => 
              jid.startsWith(numeroBase) || numeroBase.startsWith(jid.split('@')[0].split(':')[0])
            );
            nome = encontrado ? encontrado[1] : null;
          }
          
          // Se ainda não encontrou, formatar o ID
          if (!nome) {
            const numero = String(id).split('@')[0].split(':')[0];
            nome = formatarTelefone(numero);
          }
          
          // Para menção, usar o ID original
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

/**
 * Formata número de telefone para exibição
 */
function formatarTelefone(numero) {
  if (!numero) return 'Desconhecido';
  
  // Remover caracteres não numéricos
  const limpo = numero.replace(/\D/g, '');
  
  // Se for muito longo (ID interno), retornar "Usuário"
  if (limpo.length > 15 || !/^\d+$/.test(limpo)) {
    return 'Usuário';
  }
  
  // Formatar como telefone brasileiro se tiver 13 dígitos
  if (limpo.length === 13 && limpo.startsWith('55')) {
    const ddd = limpo.substring(2, 4);
    const num = limpo.substring(4);
    return `(${ddd}) *****-${num.substring(num.length - 4)}`;
  }
  
  // Formatar como telefone americano se tiver 11 dígitos
  if (limpo.length === 11 && limpo.startsWith('1')) {
    const ddd = limpo.substring(1, 4);
    const num = limpo.substring(4);
    return `+1 (${ddd}) ***-${num.substring(num.length - 4)}`;
  }
  
  // Caso último recurso, mostrar os últimos 4 dígitos
  if (limpo.length > 4) {
    return `****${limpo.substring(limpo.length - 4)}`;
  }
  
  return limpo;
}

module.exports = { iniciarCronTop10, CRON_HORARIOS, formatarTelefone };
