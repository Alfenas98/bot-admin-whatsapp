const { db } = require('./database');

function getWarns(groupId, userId) {
  return db.get(['users', groupId, userId, 'warns']).value() || 0;
}

function adicionarWarn(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  const warns = (existing.warns || 0) + 1;
  db.set(path, { ...existing, warns }).write();
  return warns;
}

function resetarWarns(groupId, userId) {
  db.set(['users', groupId, userId, 'warns'], 0).write();
}

module.exports = { getWarns, adicionarWarn, resetarWarns };
