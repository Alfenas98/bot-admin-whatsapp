const { db } = require('./database');

/**
 * Salva uma citação para um grupo.
 * @param {string} groupId
 * @param {string} autorId
 * @param {string} texto
 * @returns {number} posição da citação salva
 */
function salvarQuote(groupId, autorId, texto) {
  const quotes = db.get(['groups', groupId, 'quotes']).value() || [];
  const nova = {
    id: Date.now(),
    autor: autorId,
    texto: texto.substring(0, 1000), // Limpa em 1000 chars
    data: new Date().toISOString()
  };
  quotes.push(nova);
  db.set(['groups', groupId, 'quotes'], quotes).write();
  return quotes.length;
}

/**
 * Lista todas as citações de um grupo.
 * @param {string} groupId
 * @returns {Array}
 */
function listarQuotes(groupId) {
  return db.get(['groups', groupId, 'quotes']).value() || [];
}

/**
 * Pega uma citação aleatória.
 * @param {string} groupId
 * @returns {Object|null}
 */
function quoteAleatoria(groupId) {
  const quotes = listarQuotes(groupId);
  if (quotes.length === 0) return null;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Pega uma citação por ID.
 * @param {string} groupId
 * @param {number} id
 * @returns {Object|null}
 */
function pegarQuote(groupId, id) {
  const quotes = listarQuotes(groupId);
  const parsedId = parseInt(id, 10);
  return quotes.find(q => q.id === parsedId) || null;
}

/**
 * Limpa todas as citações.
 * @param {string} groupId
 */
function limparQuotes(groupId) {
  db.set(['groups', groupId, 'quotes'], []).write();
}

module.exports = {
  salvarQuote,
  listarQuotes,
  pegarQuote,
  quoteAleatoria,
  limparQuotes
};
