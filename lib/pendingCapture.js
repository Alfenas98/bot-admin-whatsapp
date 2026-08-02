// Chave: `${groupId}:${senderId}` -> { jogoId, expiraEm }
const pendentes = new Map();

const DURACAO_PADRAO_MS = 2 * 60 * 1000; // 2 minutos pra mandar a figurinha

function aguardarFigurinha(groupId, senderId, jogoId, duracaoMs = DURACAO_PADRAO_MS) {
  pendentes.set(`${groupId}:${senderId}`, { jogoId, expiraEm: Date.now() + duracaoMs });
}

/**
 * Consome (remove) a espera pendente, se existir e ainda não tiver expirado.
 * Retorna o jogoId, ou null se não havia nada esperando ou já expirou.
 */
function consumirFigurinhaPendente(groupId, senderId) {
  const chave = `${groupId}:${senderId}`;
  const info = pendentes.get(chave);
  if (!info) return null;

  pendentes.delete(chave);
  if (Date.now() > info.expiraEm) return null;

  return info.jogoId;
}

module.exports = { aguardarFigurinha, consumirFigurinhaPendente };
