/**
 * Sistema de Economia (Coins/Daily)
 * 
 * Comandos:
 * #daily - Receber moedas diárias
 * #saldo - Ver suas moedas
 * #transferir <quantia> @user - Transferir moedas
 * #apostar <quantia> - Apostar (cara/coroa)
 */

const { db } = require('./database');

const CONFIG = {
  DAILY_BASE: 100,
  DAILY_BONUS_STREAK: 20, // bônus por dias consecutivos
  MAX_DAILY_STREAK: 7,
  APROVACAO_MINIMA: 0.5, // 50% de chance de ganhar
};

function getUserCoins(groupId, userId) {
  const path = ['coins', groupId, userId];
  const existing = db.get(path).value();
  
  if (!existing) {
    const novo = { 
      saldo: 0, 
      ultimoDaily: 0, 
      streak: 0,
      totalGanho: 0,
      totalPerdido: 0
    };
    db.set(path, novo).write();
    return novo;
  }
  
  return existing;
}

function addCoins(groupId, userId, quantidade) {
  const path = ['coins', groupId, userId];
  const user = getUserCoins(groupId, userId);
  user.saldo += quantidade;
  if (quantidade > 0) user.totalGanho += quantidade;
  else user.totalPerdido += Math.abs(quantidade);
  db.set(path, user).write();
  return user;
}

function removeCoins(groupId, userId, quantidade) {
  const path = ['coins', groupId, userId];
  const user = getUserCoins(groupId, userId);
  if (user.saldo < quantidade) return null;
  user.saldo -= quantidade;
  user.totalPerdido += quantidade;
  db.set(path, user).write();
  return user;
}

function getDaily(groupId, userId) {
  const user = getUserCoins(groupId, userId);
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;
  
  // Verificar se já pegou daily hoje
  if (agora - user.ultimoDaily < umDia) {
    const restante = umDia - (agora - user.ultimoDaily);
    const horas = Math.floor(restante / (60 * 60 * 1000));
    const minutos = Math.floor((restante % (60 * 60 * 1000)) / (60 * 1000));
    return { sucesso: false, mensagem: `⏳ Aguarde ${horas}h ${minutos}min para pegar o daily novamente.` };
  }
  
  // Calcular streak
  const ontem = agora - umDia;
  if (user.ultimoDaily > ontem) {
    user.streak = Math.min(user.streak + 1, CONFIG.MAX_DAILY_STREAK);
  } else {
    user.streak = 1;
  }
  
  // Calcular bônus
  const bonus = (user.streak - 1) * CONFIG.DAILY_BONUS_STREAK;
  const total = CONFIG.DAILY_BASE + bonus;
  
  user.saldo += total;
  user.ultimoDaily = agora;
  user.totalGanho += total;
  
  db.set(['coins', groupId, userId], user).write();
  
  return { 
    sucesso: true, 
    mensagem: `💰 Você recebeu *${total}* coins!\n\n🔥 Streak: ${user.streak} dia(s)\n💵 Saldo: ${user.saldo} coins`,
    total,
    streak: user.streak
  };
}

function transferir(groupId, deUserId, paraUserId, quantidade) {
  const deUser = getUserCoins(groupId, deUserId);
  
  if (deUser.saldo < quantidade) {
    return { sucesso: false, mensagem: '❌ Saldo insuficiente.' };
  }
  
  removeCoins(groupId, deUserId, quantidade);
  addCoins(groupId, paraUserId, quantidade);
  
  return { 
    sucesso: true, 
    mensagem: `✅ Transferência de *${quantity}* coins realizada com sucesso!` 
  };
}

function apostar(groupId, userId, quantidade, tipo) {
  const user = getUserCoins(groupId, userId);
  
  if (user.saldo < quantidade) {
    return { sucesso: false, mensagem: '❌ Saldo insuficiente.' };
  }
  
  const resultado = Math.random() < CONFIG.APROVACAO_MINIMA ? 'ganhou' : 'perdeu';
  
  if (resultado === 'ganhou') {
    const ganho = quantidade * 2;
    addCoins(groupId, userId, ganho);
    return { 
      sucesso: true, 
      resultado: 'ganhou',
      mensagem: `🎉 Você ganhou! +${ganho} coins\n\n💵 Saldo: ${user.saldo + ganho} coins` 
    };
  } else {
    removeCoins(groupId, userId, quantidade);
    return { 
      sucesso: true, 
      resultado: 'perdeu',
      mensagem: `😢 Você perdeu! -${quantity} coins\n\n💵 Saldo: ${user.saldo - quantidade} coins` 
    };
  }
}

function getSaldo(groupId, userId) {
  const user = getUserCoins(groupId, userId);
  return {
    saldo: user.saldo,
    streak: user.streak,
    totalGanho: user.totalGanho,
    totalPerdido: user.totalPerdido
  };
}

module.exports = {
  getDaily,
  transferir,
  apostar,
  getSaldo,
  addCoins,
  removeCoins,
  getUserCoins,
  CONFIG
};
