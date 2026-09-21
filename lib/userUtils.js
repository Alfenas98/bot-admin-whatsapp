/**
 * Utilitário para buscar nome do usuário
 * Resolve o nome exibido (pushName) a partir da metadata do grupo
 */

async function buscarNomeUsuario(sock, groupId, userId, fallbackName = null) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    if (metadata?.participants) {
      const participante = metadata.participants.find(p => p.id === userId);
      if (participante) {
        return participante.pushName || participante.name || fallbackName;
      }
    }
  } catch (e) {}
  
  return fallbackName;
}

/**
 * Formata ID de usuário para exibição
 * Remove sufixos como @s.whatsapp.net, @lid, etc.
 */
function formatarIdUsuario(userId) {
  if (!userId) return 'Desconhecido';
  
  // Remover sufixo @s.whatsapp.net, @lid, etc.
  const partes = userId.split('@');
  const identificador = partes[0];
  
  // Se for muito longo (ID interno do WhatsApp), indicar que é um ID
  if (identificador.length > 15) {
    return `Usuário ${identificador.substring(0, 8)}...`;
  }
  
  // Se for um número de telefone, formatar
  if (/^\d+$/.test(identificador)) {
    // Formatar como telefone brasileiro se tiver 13 dígitos (55 + DDD + número)
    if (identificador.length === 13 && identificador.startsWith('55')) {
      const ddd = identificador.substring(2, 4);
      const numero = identificador.substring(4);
      return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    }
    return identificador;
  }
  
  return identificador;
}

module.exports = { buscarNomeUsuario, formatarIdUsuario };
