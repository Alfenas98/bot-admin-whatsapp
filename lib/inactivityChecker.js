/**
 * Sistema de Detecção de Inatividade
 * 
 * - Avisa membros inativos antes de remover
 * - Notifica o grupo sobre remoções
 * - Rastreia avisos enviados
 */

const { db } = require('./database');

/**
 * Calcula membros inativos
 */
function calcularInativos(groupId, participantes, botId, diasLimite) {
  const agora = Date.now();
  const limiteMs = diasLimite * 24 * 60 * 60 * 1000;
  const inativos = [];
  const semDados = [];
  
  for (const p of participantes) {
    // Pular o próprio bot
    if (p.id === botId) continue;
    
    const userData = db.get(['users', groupId, p.id]).value();
    
    if (!userData || !userData.ultimaAtividade) {
      semDados.push(p.id);
      continue;
    }
    
    const tempoInativo = agora - userData.ultimaAtividade;
    if (tempoInativo > limiteMs) {
      inativos.push(p.id);
    }
  }
  
  return { inativos, semDados };
}

/**
 * Registra aviso de inatividade enviado a um membro
 */
function registrarAviso(groupId, userId) {
  const path = ['inatividadeAvisos', groupId, userId];
  db.set(path, {
    avisadoEm: Date.now(),
    ativo: true
  }).write();
}

/**
 * Verifica se um membro já foi avisado recentemente (nas últimas 24h)
 */
function foiAvisadoRecentemente(groupId, userId) {
  const path = ['inatividadeAvisos', groupId, userId];
  const aviso = db.get(path).value();
  
  if (!aviso || !aviso.ativo) return false;
  
  const agora = Date.now();
  const tempoAviso = 24 * 60 * 60 * 1000; // 24 horas
  
  if (agora - aviso.avisadoEm > tempoAviso) {
    // Aviso expirou, remover registro
    db.set(path, { ativo: false }).write();
    return false;
  }
  
  return true;
}

/**
 * Limpa aviso quando membro volta a ficar ativo
 */
function limparAviso(groupId, userId) {
  const path = ['inatividadeAvisos', groupId, userId];
  db.set(path, { ativo: false }).write();
}

/**
 * Obtém lista de membros que podem ser avisados (inativos mas não avisados)
 */
function getMembrosParaAvisar(groupId, participantes, botId, diasLimite) {
  const agora = Date.now();
  const limiteMs = diasLimite * 24 * 60 * 60 * 1000;
  const paraAvisar = [];
  
  for (const p of participantes) {
    if (p.id === botId) continue;
    
    // Pular admins do grupo
    if (p.admin) continue;
    
    const userData = db.get(['users', groupId, p.id]).value();
    
    if (!userData || !userData.ultimaAtividade) continue;
    
    const tempoInativo = agora - userData.ultimaAtividade;
    
    if (tempoInativo > limiteMs) {
      // Verificar se já foi avisado
      if (!foiAvisadoRecentemente(groupId, p.id)) {
        paraAvisar.push(p.id);
      }
    }
  }
  
  return paraAvisar;
}

/**
 * Obtém lista de membros que podem ser removidos (avisados há +24h)
 */
function getMembrosParaRemover(groupId, participantes, botId, diasLimite) {
  const agora = Date.now();
  const limiteMs = diasLimite * 24 * 60 * 60 * 1000;
  const avisoExpirado = 24 * 60 * 60 * 1000; // 24h após aviso
  const paraRemover = [];
  
  for (const p of participantes) {
    if (p.id === botId) continue;
    if (p.admin) continue;
    
    const userData = db.get(['users', groupId, p.id]).value();
    if (!userData || !userData.ultimaAtividade) continue;
    
    const tempoInativo = agora - userData.ultimaAtividade;
    
    if (tempoInativo > limiteMs) {
      const aviso = db.get(['inatividadeAvisos', groupId, p.id]).value();
      
      // Se foi avisado e o aviso expirou (+24h), remover
      if (aviso && aviso.ativo && (agora - aviso.avisadoEm > avisoExpirado)) {
        paraRemover.push(p.id);
      }
    }
  }
  
  return paraRemover;
}

module.exports = {
  calcularInativos,
  registrarAviso,
  foiAvisadoRecentemente,
  limparAviso,
  getMembrosParaAvisar,
  getMembrosParaRemover
};
