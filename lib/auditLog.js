const { getGroupConfig } = require('./database');

/**
 * Registra uma ação administrativa e manda pro destino configurado
 * (ou pro próprio grupo, se nenhum destino específico foi definido).
 * Não faz nada se a auditoria estiver desativada nesse grupo.
 */
async function registrarAuditoria(sock, groupId, texto) {
  const config = getGroupConfig(groupId);
  if (!config.auditoria.ativo) return;

  const destino = config.auditoria.destino || groupId;
  const agora = new Date();
  const horario = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  try {
    await sock.sendMessage(destino, { text: `📋 [${horario}] ${texto}` });
  } catch (err) {
    console.error('[auditoria] Falha ao enviar log:', err.message);
  }
}

module.exports = { registrarAuditoria };
