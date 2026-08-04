// Chave: `${groupId}:${alvoId}` -> { deId, tipo, expiraEm }
const propostas = new Map();

const DURACAO_PADRAO_MS = 2 * 60 * 1000; // 2 minutos pra aceitar

function propor(groupId, deId, alvoId, tipo = 'namoro', duracaoMs = DURACAO_PADRAO_MS) {
  propostas.set(`${groupId}:${alvoId}`, { deId, tipo, expiraEm: Date.now() + duracaoMs });
}

/**
 * Consome (remove) a proposta pendente pro alvo, se existir e não tiver
 * expirado. Retorna { deId, tipo }, ou null.
 */
function consumirProposta(groupId, alvoId) {
  const chave = `${groupId}:${alvoId}`;
  const info = propostas.get(chave);
  if (!info) return null;

  propostas.delete(chave);
  if (Date.now() > info.expiraEm) return null;

  return info;
}

module.exports = { propor, consumirProposta };
