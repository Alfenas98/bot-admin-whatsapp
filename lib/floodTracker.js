// Map<`${groupId}:${userId}`, number[]> -> timestamps (ms) dos envios recentes
const historico = new Map();

/**
 * Registra um envio de figurinha e diz se ultrapassou o limite configurado
 * pro grupo (limite de envios dentro de tempoSegundos).
 */
function registrarFigurinha(groupId, userId, limite, tempoSegundos) {
  const chave = `${groupId}:${userId}`;
  const agora = Date.now();
  const janelaMs = tempoSegundos * 1000;

  const timestamps = (historico.get(chave) || []).filter(t => agora - t < janelaMs);
  timestamps.push(agora);
  historico.set(chave, timestamps);

  return timestamps.length > limite;
}

module.exports = { registrarFigurinha };
