/**
 * Validação de Dados do Banco
 * 
 * Garante que os dados salvos no banco estão no formato correto.
 */

const { db } = require('./database');

function validarGrupo(groupId) {
  const path = ['groups', groupId];
  const config = db.get(path).value();
  
  if (!config) return { valido: false, motivo: 'Grupo não encontrado' };
  
  // Verificar campos obrigatórios
  const obrigatorios = ['prefixos', 'levelSystem', 'antilink'];
  for (const campo of obrigatorios) {
    if (!(campo in config)) {
      return { valido: false, motivo: `Campo ${campo} não encontrado` };
    }
  }
  
  return { valido: true };
}

function validarUsuario(groupId, userId) {
  const path = ['users', groupId, userId];
  const user = db.get(path).value();
  
  if (!user) return { valido: false, motivo: 'Usuário não encontrado' };
  
  if (typeof user.xp !== 'number' || user.xp < 0) {
    return { valido: false, motivo: 'XP inválido' };
  }
  
  if (typeof user.nivel !== 'number' || user.nivel < 1) {
    return { valido: false, motivo: 'Nível inválido' };
  }
  
  return { valido: true };
}

function corrigirGrupo(groupId) {
  const path = ['groups', groupId];
  let config = db.get(path).value();
  
  if (!config) return;
  
  // Corrigir campos ausentes
  if (!config.prefixos) config.prefixos = ['#'];
  if (typeof config.levelSystem !== 'boolean') config.levelSystem = false;
  if (typeof config.antilink !== 'boolean') config.antilink = false;
  if (!config.antimidia) config.antimidia = { imagem: false, video: false, audio: false, sticker: false, documento: false };
  if (!config.jogos) config.jogos = { estado: 'idle', jogoAtual: null, figurinhas: {}, perguntasCustom: {} };
  
  db.set(path, config).write();
}

function corrigirUsuario(groupId, userId) {
  const path = ['users', groupId, userId];
  let user = db.get(path).value();
  
  if (!user) return;
  
  if (typeof user.xp !== 'number') user.xp = 0;
  if (typeof user.nivel !== 'number' || user.nivel < 1) user.nivel = 1;
  if (typeof user.mensagens !== 'number') user.mensagens = 0;
  if (!user.streak) user.streak = 0;
  if (!user.ultimoDiaAtivo) user.ultimoDiaAtivo = 0;
  
  db.set(path, user).write();
}

module.exports = {
  validarGrupo,
  validarUsuario,
  corrigirGrupo,
  corrigirUsuario
};
