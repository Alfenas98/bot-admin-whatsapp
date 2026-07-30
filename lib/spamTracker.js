// Map<`${groupId}:${userId}`, { texto, contagem }>
const historico = new Map();

/**
 * Registra uma mensagem de texto e retorna true se o mesmo texto foi
 * repetido `limite` vezes seguidas ou mais pelo mesmo usuário.
 */
function registrarMensagem(groupId, userId, texto, limite) {
  if (!texto) return false;
  const chave = `${groupId}:${userId}`;
  const anterior = historico.get(chave);

  if (anterior && anterior.texto === texto) {
    anterior.contagem += 1;
    historico.set(chave, anterior);
    return anterior.contagem >= limite;
  }

  historico.set(chave, { texto, contagem: 1 });
  return false;
}

module.exports = { registrarMensagem };
