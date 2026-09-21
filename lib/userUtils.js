/**
 * Utilitário para buscar nome do usuário
 */

async function buscarNomeUsuario(sock, groupId, userId, fallbackName = null) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    if (metadata?.participants) {
      // Buscar por ID completo primeiro
      let participante = metadata.participants.find(p => p.id === userId);
      
      // Se não encontrar, buscar apenas pelo número (antes do @)
      if (!participante) {
        const userIdNum = userId.split('@')[0];
        participante = metadata.participants.find(p => p.id.startsWith(userIdNum));
      }
      
      if (participante) {
        return participante.pushName || participante.name || fallbackName;
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
  
  // Se for um ID interno do WhatsApp (LID), retornar "Usuário"
  if (identificador.length > 15 || !identificador.match(/^\d+$/)) {
    return 'Usuário';
  }
  
  return identificador;
}

module.exports = { buscarNomeUsuario, formatarIdUsuario };
