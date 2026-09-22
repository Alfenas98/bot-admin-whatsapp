/**
 * Utilitários para usuários e menções
 */

/**
 * Salvar pushName no banco
 */
async function salvarNome(groupId, userId, nome) {
  try {
    const { db } = require('./database');
    const path = ['users', groupId, userId];
    const existing = db.get(path).value() || {};
    
    if (nome && nome !== existing.nome) {
      db.set(path, { ...existing, nome }).write();
    }
  } catch (e) {}
}

/**
 * Buscar ID real do participante no grupo
 * Retorna o ID exato que está na metadata (ex: 123@lid)
 */
async function buscarIdReal(sock, groupId, userId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    if (metadata?.participants) {
      // Buscar pelo ID exato primeiro
      let p = metadata.participants.find(p => p.id === userId);
      
      // Se não encontrar, buscar pelo número base
      if (!p) {
        const numeroBase = String(userId).split('@')[0].split(':')[0];
        p = metadata.participants.find(p => 
          p.id.split('@')[0].split(':')[0] === numeroBase
        );
      }
      
      if (p) {
        return p.id; // Retorna o ID real (ex: 123@lid)
      }
    }
  } catch (e) {}
  
  // Fallback: retornar o próprio ID
  return userId;
}

module.exports = { 
  salvarNome, 
  buscarIdReal
};
