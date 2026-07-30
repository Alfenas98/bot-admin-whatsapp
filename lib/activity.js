const { db } = require('./database');

/**
 * Registra a última atividade (mensagem enviada) de um usuário num grupo.
 */
function registrarAtividade(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  db.set(path, { ...existing, ultimaAtividade: Date.now() }).write();
}

/**
 * Registra a data de entrada de um usuário no grupo (usado como referência
 * quando ele nunca mandou nenhuma mensagem).
 */
function registrarEntrada(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  if (existing.dataEntrada) return; // não sobrescreve se já tem
  db.set(path, { ...existing, dataEntrada: Date.now() }).write();
}

/**
 * Retorna o timestamp da última atividade conhecida (mensagem, ou data de
 * entrada se nunca mandou nada). Retorna null se não temos nenhum dado.
 */
function getUltimaAtividade(groupId, userId) {
  const user = db.get(['users', groupId, userId]).value();
  if (!user) return null;
  return user.ultimaAtividade || user.dataEntrada || null;
}

module.exports = { registrarAtividade, registrarEntrada, getUltimaAtividade };
