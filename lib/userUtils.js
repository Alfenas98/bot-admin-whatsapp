/**
 * Salvar nome do usuário no banco de dados
 */
async function salvarNome(groupId, userId, nome) {
  try {
    const { db } = require('./database');
    const path = ['users', groupId, userId];
    const existing = db.get(path).value() || {};
    
    // Só atualizar se o nome é diferente e não está vazio
    if (nome && nome !== existing.nome) {
      db.set(path, { ...existing, nome }).write();
    }
  } catch (e) {
    // Silenciar erro
  }
}

/**
 * Buscar nome do usuário
 */
async function buscarNomeUsuario(sock, groupId, userId, fallbackName = null) {
  try {
    const { db } = require('./database');
    const user = db.get(['users', groupId, userId]).value() || {};
    
    // Primeiro tentar nome salvo no banco
    if (user.nome) {
      return user.nome;
    }
    
    // Tentar buscar da metadata
    const metadata = await sock.groupMetadata(groupId);
    if (metadata?.participants) {
      const participante = metadata.participants.find(p => p.id === userId);
      if (participante && participante.pushName) {
        return participante.pushName;
      }
    }
  } catch (e) {}
  
  return fallbackName;
}

/**
 * Formata ID de usuário para exibição
 */
function formatarIdUsuario(userId) {
  if (!userId) return 'Desconhecido';
  
  const partes = userId.split('@');
  const identificador = partes[0];
  
  if (identificador.length > 15 || !identificador.match(/^\d+$/)) {
    return 'Usuário';
  }
  
  return identificador;
}

module.exports = { salvarNome, buscarNomeUsuario, formatarIdUsuario };
