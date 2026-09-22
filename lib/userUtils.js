/**
 * Extrair número de telefone de um ID
 * @lid -> número real
 */
function extrairNumero(id) {
  if (!id) return null;
  
  const partes = id.split('@');
  const numero = partes[0].split(':')[0];
  
  // Se começa com 55 (Brasil) ou 1 (EUA), é um número válido
  if (/^\d{10,15}$/.test(numero)) {
    return numero;
  }
  
  return null;
}

/**
 * Formatar ID para menção
 */
function formatarMencao(id) {
  const numero = extrairNumero(id);
  if (numero) {
    return `${numero}@s.whatsapp.net`;
  }
  // Fallback
  const fallback = String(id).split('@')[0];
  return `${fallback}@s.whatsapp.net`;
}

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
 * Buscar nome do usuário (banco ou metadata)
 */
async function buscarNomeUsuario(sock, groupId, userId, fallbackName = null) {
  try {
    const { db } = require('./database');
    const user = db.get(['users', groupId, userId]).value() || {};
    
    if (user.nome) {
      return user.nome;
    }
    
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
 * Formatar ID para exibição
 */
function formatarIdDisplay(userId) {
  if (!userId) return 'Desconhecido';
  
  const idNumeros = String(userId).split('@')[0].split(':')[0];
  
  if (idNumeros.length > 15 || !/^\d+$/.test(idNumeros)) {
    return 'Usuário';
  }
  
  // Formatar como telefone brasileiro se tiver 13 dígitos
  if (idNumeros.length === 13 && idNumeros.startsWith('55')) {
    const ddd = idNumeros.substring(2, 4);
    const num = idNumeros.substring(4);
    return `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`;
  }
  
  return idNumeros;
}

module.exports = { 
  extrairNumero, 
  formatarMencao, 
  salvarNome, 
  buscarNomeUsuario, 
  formatarIdDisplay 
};
