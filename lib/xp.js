/**
 * Sistema de XP, Níveis e Cargos
 * 
 * Dificuldade PROGRESSIVA para incentivar participação contínua.
 * Quanto maior o nível, mais difícil fica subir.
 */

const { db } = require('./database');

const CONFIG = {
  XP_POR_MENSAGEM: 5,
  XP_POR_MSG_CURTA: 3,
  XP_POR_MSG_LONGA: 8,
  XP_POR_FIGURINHA: 2,
  XP_POR_AUDIO: 3,
  
  // Bônus de streak
  STREAK_BONUS: {
    3: 3,
    5: 5,
    10: 10,
    20: 25,
    50: 50
  },
  
  // Bônus diário
  BONUS_PRIMEIRA_MSG_DIA: 10,
  BONUS_7_DIAS: 50,
  
  // Fórmula de nível (progressiva)
  XP_BASE: 100,
  XP_EXPONENCIE: 1.8,
  XP_INCREMENTO: 20
};

/**
 * Calcula XP necessário para o próximo nível
 * Fórmula progressiva: base × (nível ^ expoente) + (nível × incremento)
 */
function xpParaProximoNivel(nivelAtual) {
  if (!nivelAtual || nivelAtual < 1) nivelAtual = 1;
  
  const nivel = nivelAtual;
  const xpNecessario = Math.floor(
    CONFIG.XP_BASE * Math.pow(nivel, CONFIG.XP_EXPONENCIE) + 
    (nivel * CONFIG.XP_INCREMENTO)
  );
  
  return Math.max(xpNecessario, 10);
}

/**
 * Calcula XP total acumulado para chegar ao nível N
 */
function xpAcumuladoParaNivel(nivel) {
  let total = 0;
  for (let i = 1; i < nivel; i++) {
    total += xpParaProximoNivel(i);
  }
  return total;
}

/**
 * Calcula barra de progresso visual
 */
function barraProgresso(atual, total, tamanho = 12) {
  if (!total || total === 0) return '█'.repeat(tamanho);
  const proporcao = Math.min(atual / total, 1);
  const cheios = Math.floor(proporcao * tamanho);
  const vazios = tamanho - cheios;
  return '█'.repeat(cheios) + '░'.repeat(vazios);
}

/**
 * Obtém patente baseado no nível
 */
function getPatente(nivel) {
  const patentes = [
    { min: 1, max: 3, patente: '🆕 Novato' },
    { min: 4, max: 6, patente: '🟢 Ativo' },
    { min: 7, max: 10, patente: '🔵 Membro Fiel' },
    { min: 11, max: 15, patente: '🟡 Veterano' },
    { min: 16, max: 20, patente: '🟠 Elite' },
    { min: 21, max: 30, patente: '🔴 Mestre' },
    { min: 31, max: 50, patente: '👑 Lenda' },
    { min: 51, max: Infinity, patente: '💎 Diamond' }
  ];
  
  for (const p of patentes) {
    if (nivel >= p.min && nivel <= p.max) {
      return p.patente;
    }
  }
  return '💎 Diamond';
}

/**
 * Obtém dados do usuário
 */
function getUser(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value();
  
  if (!existing) {
    const novo = { 
      xp: 0, 
      nivel: 1, 
      mensagens: 0,
      streak: 0,
      ultimoDiaAtivo: 0,
      diasConsecutivos: 0,
      primeiraMsgDia: false
    };
    db.set(path, novo).write();
    return novo;
  }
  
  if (!existing.nivel || existing.nivel < 1) existing.nivel = 1;
  if (!existing.streak) existing.streak = 0;
  if (!existing.diasConsecutivos) existing.diasConsecutivos = 0;
  
  return existing;
}

/**
 * Adiciona XP e verifica subida de nível
 * @param {string} groupId 
 * @param {string} userId 
 * @param {number} quantidade - base de XP (padrão 5)
 * @param {string} tipoMsg - 'texto' | 'figurinha' | 'audio'
 */
function adicionarXP(groupId, userId, quantidade = null, tipoMsg = 'texto') {
  const path = ['users', groupId, userId];
  const user = getUser(groupId, userId);
  
  // Calcular XP base por tipo de mensagem
  let xpBase = quantidade || CONFIG.XP_POR_MENSAGEM;
  if (!quantidade) {
    switch (tipoMsg) {
      case 'texto_curto': xpBase = CONFIG.XP_POR_MSG_CURTA; break;
      case 'texto_longo': xpBase = CONFIG.XP_POR_MSG_LONGA; break;
      case 'figurinha': xpBase = CONFIG.XP_POR_FIGURINHA; break;
      case 'audio': xpBase = CONFIG.XP_POR_AUDIO; break;
      default: xpBase = CONFIG.XP_POR_MENSAGEM;
    }
  }
  
  // Incrementar streak
  user.streak++;
  
  // Calcular bônus de streak
  let bonusStreak = 0;
  for (const [streakMin, bonus] of Object.entries(CONFIG.STREAK_BONUS).sort((a, b) => b[0] - a[0])) {
    if (user.streak >= parseInt(streakMin)) {
      bonusStreak = bonus;
      break;
    }
  }
  
  // Verificar bônus diário
  const hoje = new Date().toDateString();
  const ultimoDia = user.ultimoDiaAtivo ? new Date(user.ultimoDiaAtivo).toDateString() : '';
  let bonusDiario = 0;
  let diasConsecutivos = user.diasConsecutivos || 0;
  
  if (hoje !== ultimoDia) {
    // Primeiro mensagem do dia
    if (!user.primeiraMsgDia) {
      bonusDiario += CONFIG.BONUS_PRIMEIRA_MSG_DIA;
      user.primeiraMsgDia = true;
    }
    
    // Verificar dias consecutivos
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    if (ultimoDia === ontem.toDateString()) {
      diasConsecutivos++;
    } else {
      diasConsecutivos = 1;
    }
    
    // Bônus de 7 dias
    if (diasConsecutivos % 7 === 0 && diasConsecutivos > 0) {
      bonusDiario += CONFIG.BONUS_7_DIAS;
    }
    
    user.ultimoDiaAtivo = Date.now();
    user.diasConsecutivos = diasConsecutivos;
  }
  
  // Total XP
  const xpGanho = xpBase + bonusStreak + bonusDiario;
  user.xp += xpGanho;
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
    xpProximoNivel: xpParaProximoNivel(user.nivel),
    xpGanho,
    bonusStreak,
    bonusDiario,
    streak: user.streak,
    diasConsecutivos: user.diasConsecutivos
  };
}

/**
 * Obtém top membros do ranking
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
      pontuacao: xpAcumuladoParaNivel(dados.nivel || 1) + (dados.xp || 0)
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite);
  
  return lista;
}

/**
 * Reseta streak (se usuário ficar muito tempo sem mensagem)
 */
function resetStreak(groupId, userId) {
  const path = ['users', groupId, userId];
  const user = getUser(groupId, userId);
  user.streak = 0;
  user.primeiraMsgDia = false;
  db.set(path, user).write();
}

module.exports = { 
  getUser, 
  adicionarXP, 
  xpParaProximoNivel, 
  xpAcumuladoParaNivel,
  barraProgresso,
  getTopUsuarios,
  getPatente,
  resetStreak,
  CONFIG
};