const { db } = require('./database');
const { nomesParecidos } = require('./similarity');

function salvarNome(groupId, userId, pushName) {
  if (!pushName) return;
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  db.set(path, { ...existing, pushName }).write();
}

function verificarClone(groupId, senderId, pushName, adminIds) {
  if (!pushName) return null;

  for (const adminId of adminIds) {
    if (adminId === senderId) continue;
    const nomeAdmin = db.get(['users', groupId, adminId, 'pushName']).value();
    if (nomeAdmin && nomesParecidos(pushName, nomeAdmin)) {
      return adminId;
    }
  }
  return null;
}

module.exports = { salvarNome, verificarClone };
