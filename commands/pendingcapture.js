// Chave: `${groupId}:${senderId}` -> { jogoId, buffers: Buffer[], expiraEm }
const coletas = new Map();

const DURACAO_PADRAO_MS = 10 * 60 * 1000; // 10 minutos pra mandar as figurinhas e usar #salvar figurinhas

/**
 * Inicia (ou reinicia) uma coleta de figurinhas pra um jogo. Enquanto a coleta
 * estiver ativa, toda figurinha que esse remetente mandar no grupo é guardada
 * em memória até ele usar "#salvar figurinhas" (ou o tempo expirar).
 */
function iniciarColeta(groupId, senderId, jogoId, duracaoMs = DURACAO_PADRAO_MS) {
  coletas.set(`${groupId}:${senderId}`, { jogoId, buffers: [], expiraEm: Date.now() + duracaoMs });
}

function coletaExpirada(info) {
  return !info || Date.now() > info.expiraEm;
}

/**
 * Checagem rápida (sem custo de download) se há uma coleta ativa pra esse remetente.
 */
function temColetaAtiva(groupId, senderId) {
  const info = coletas.get(`${groupId}:${senderId}`);
  if (coletaExpirada(info)) {
    if (info) coletas.delete(`${groupId}:${senderId}`);
    return false;
  }
  return true;
}

/**
 * Se houver uma coleta ativa pra esse remetente, adiciona a figurinha (buffer) a ela.
 * Retorna a quantidade de figurinhas já guardadas na coleta, ou null se não há coleta ativa.
 */
function adicionarFigurinhaColeta(groupId, senderId, buffer) {
  const chave = `${groupId}:${senderId}`;
  const info = coletas.get(chave);
  if (coletaExpirada(info)) {
    coletas.delete(chave);
    return null;
  }
  info.buffers.push(buffer);
  return info.buffers.length;
}

/**
 * Finaliza a coleta ativa pra esse remetente, retornando { jogoId, buffers } ou
 * null se não havia nenhuma coleta ativa (ou já tinha expirado).
 */
function finalizarColeta(groupId, senderId) {
  const chave = `${groupId}:${senderId}`;
  const info = coletas.get(chave);
  coletas.delete(chave);
  if (coletaExpirada(info)) return null;
  return info;
}

module.exports = { iniciarColeta, temColetaAtiva, adicionarFigurinhaColeta, finalizarColeta };