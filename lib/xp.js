const { db } = require('./database');

function xpParaNivel(nivel) {
  return nivel * nivel * 20;
}

function getUser(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value();
  if (!existing) {
    const novo = { xp: 0, nivel: 1, mensagens: 0 };
    db.set(path, novo).write();
    return novo;
  }
  return existing;
}

function adicionarXP(groupId, userId, quantidade = 5) {
  const path = ['users', groupId, userId];
  const user = getUser(groupId, userId);

  user.xp += quantidade;
  user.mensagens += 1;

  let subiuNivel = false;
  while (user.xp >= xpParaNivel(user.nivel)) {
    user.xp -= xpParaNivel(user.nivel);
    user.nivel += 1;
    subiuNivel = true;
  }

  db.set(path, user).write();
  return { subiuNivel, nivel: user.nivel, xp: user.xp };
}

module.exports = { getUser, adicionarXP, xpParaNivel };
