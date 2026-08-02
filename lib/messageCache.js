// Map<`${groupId}:${msgId}`, { texto, senderId }>
const cache = new Map();
const LIMITE = 500; // evita crescer indefinidamente

function guardar(groupId, msgId, texto, senderId) {
  if (!texto) return;
  const chave = `${groupId}:${msgId}`;
  cache.set(chave, { texto, senderId });
  if (cache.size > LIMITE) {
    const primeiraChave = cache.keys().next().value;
    cache.delete(primeiraChave);
  }
}

function buscar(groupId, msgId) {
  return cache.get(`${groupId}:${msgId}`);
}

module.exports = { guardar, buscar };
