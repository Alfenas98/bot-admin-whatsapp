/**
 * Sistema de Warns Melhorado
 * 
 * Agora com:
 * - Warns temporários (expiram após X dias)
 * - Mute temporário automático ao atingir limite
 * - Histórico de warns com motivo
 */

const { db } = require('./database');

const TEMPO_EXPIRACAO = 7 * 24 * 60 * 60 * 1000; // 7 dias

function getWarns(groupId, userId) {
  const user = db.get(['users', groupId, userId]).value() || {};
  return user.warns || 0;
}

function getWarnsDetalhados(groupId, userId) {
  const user = db.get(['users', groupId, userId]).value() || {};
  return user.warnsDetalhados || [];
}

function adicionarWarn(groupId, userId, motivo = 'Sem motivo') {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  const warns = (existing.warns || 0) + 1;
  
  // Adicionar ao histórico detalhado
  const historico = existing.warnsDetalhados || [];
  historico.push({
    data: Date.now(),
    motivo: motivo,
    admin: null // Será preenchido depois
  });
  
  db.set(path, { 
    ...existing, 
    warns,
    warnsDetalhados: historico
  }).write();
  
  return warns;
}

function resetarWarns(groupId, userId) {
  db.set(['users', groupId, userId, 'warns'], 0).write();
  db.set(['users', groupId, userId, 'warnsDetalhados'], []).write();
}

function resetarWarnsExpirados(groupId, userId) {
  const user = db.get(['users', groupId, userId]).value() || {};
  const historico = user.warnsDetalhados || [];
  
  const agora = Date.now();
  const warnsAtivos = historico.filter(w => agora - w.data < TEMPO_EXPIRACAO);
  
  if (warnsAtivos.length !== historico.length) {
    db.set(['users', groupId, userId, 'warns'], warnsAtivos.length).write();
    db.set(['users', groupId, userId, 'warnsDetalhados'], warnsAtivos).write();
  }
  
  return warnsAtivos.length;
}

function adicionarMuteTemporario(groupId, userId, duracaoMs) {
  const path = ['users', groupId, userId, 'muteAte'];
  db.set(path, Date.now() + duracaoMs).write();
}

function getMuteAte(groupId, userId) {
  return db.get(['users', groupId, userId, 'muteAte']).value() || 0;
}

function estaMutado(groupId, userId) {
  const muteAte = getMuteAte(groupId, userId);
  return Date.now() < muteAte;
}

module.exports = { 
  getWarns, 
  getWarnsDetalhados,
  adicionarWarn, 
  resetarWarns,
  resetarWarnsExpirados,
  adicionarMuteTemporario,
  getMuteAte,
  estaMutado,
  TEMPO_EXPIRACAO
};
