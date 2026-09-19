/**
 * Sistema de XP e Níveis
 * 
 * Fórmula:
 * - Nível 1 -> 2: 20 XP (1x1x20)
 * - Nível 2 -> 3: 80 XP (2x2x20)
 * - Nível 3 -> 4: 180 XP (3x3x20)
 * - Nível 4 -> 5: 320 XP (4x4x20)
 * - Nível N -> N+1: N² × 20 XP
 * 
 * Para subir de nível, precisa acumular o XP necessário.
 */

const { db } = require('./database');

/**
 * Retorna o XP necessário para subir DO nível ATUAL para o PRÓXIMO
 * Ex: Nível 1 precisa de 20 XP para chegar ao nível 2
 */
function xpParaProximoNivel(nivelAtual) {
  if (!nivelAtual || nivelAtual < 1) nivelAtual = 1;
  return (nivelAtual + 1) * (nivelAtual + 1) * 20;
}

/**
 * Retorna o XP acumulado necessário para chegar ao nível N
 */
function xpAcumuladoParaNivel(nivel) {
  let total = 0;
  for (let i = 1; i < nivel; i++) {
    total += i * i * 20;
  }
  return total;
}

/**
 * Calcula barra de progresso visual
 */
function barraProgresso(atual, total, tamanho = 10) {
  if (!total || total === 0) return '█'.repeat(tamanho);
  const proporcao = Math.min(atual / total, 1);
  const cheios = Math.floor(proporcao * tamanho);
  const vazios = tamanho - cheios;
  return '█'.repeat(cheios) + '░'.repeat(vazios);
}

/**
 * Obtém dados do usuário
 */
function getUser(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value();
  
  if (!existing) {
    const novo = { xp: 0, nivel: 1, mensagens: 0 };
    db.set(path, novo).write();
    return novo;
  }
  
  // Garantir que nível seja válido
  if (!existing.nivel || existing.nivel < 1) {
    existing.nivel = 1;
  }
  
  return existing;
}

/**
 * Adiciona XP e verifica subida de nível
 */
function adicionarXP(groupId, userId, quantidade = 5) {
  const path = ['users', groupId, userId];
  const user = getUser(groupId, userId);
  
  user.xp += quantidade;
  user.mensagens += 1;
  
  let subiuNivel = false;
  let niveisSubidos = 0;
  
  // Verificar se subiu de nível
  while (user.xp >= xpParaProximoNivel(user.nivel)) {
    user.xp -= xpParaProximoNivel(user.nivel);
    user.nivel += 1;
    subiuNivel = true;
    niveisSubidos++;
  }
  
  db.set(path, user).write();
  
  return { 
    subiuNivel, 
    niveisSubidos,
    nivel: user.nivel, 
    xp: user.xp,
    xpProximoNivel: xpParaProximoNivel(user.nivel)
  };
}

/**
 * Obtém ranking dos top 10 membros
 */
function getTopUsuarios(groupId, limite = 10) {
  const users = db.get(['users', groupId]).value() || {};
  
  const lista = Object.entries(users)
    .map(([id, dados]) => ({
      id,
      ...dados,
      nivel: dados.nivel || 1,
      xp: dados.xp || 0,
      mensagens: dados.mensagens || 0,
      // Pontuação total considerando níveis
      pontuacao: (dados.nivel || 1) * 10000 + (dados.xp || 0)
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite);
  
  return lista;
}

module.exports = { 
  getUser, 
  adicionarXP, 
  xpParaProximoNivel, 
  xpAcumuladoParaNivel,
  barraProgresso,
  getTopUsuarios
};
