/**
 * Sistema de Permissões por Cargo
 * 
 * Agora o bot verifica o nível do usuário e permite ou bloqueia
 * ações baseado no cargo que ele possui.
 * 
 * Funciona com:
 * - Anti-link (verifica se tem permissão para links)
 * - Anti-imagem (verifica se tem permissão para imagens)
 * - Anti-vídeo (verifica se tem permissão para vídeos)
 * - Anti-sticker (verifica se tem permissão para stickers)
 * - Anti-documento (verifica se tem permissão para documentos)
 */

const { db } = require('./database');
const { getPatente } = require('./xp');

const CARGOS_PERMISSOES = {
  links: 4,      // Nível 4 (Ativo) em diante
  imagens: 7,    // Nível 7 (Membro Fiel) em diante
  videos: 11,    // Nível 11 (Veterano) em diante
  stickers: 21,  // Nível 21 (Mestre) em diante
  documentos: 16 // Nível 16 (Elite) em diante
};

function getNivelUsuario(groupId, userId) {
  const user = db.get(['users', groupId, userId]).value() || {};
  return user.nivel || 1;
}

function temPermissaoNivel(nivel, permissao) {
  const nivelNecessario = CARGOS_PERMISSOES[permissao];
  if (!nivelNecessario) return false;
  return nivel >= nivelNecessario;
}

function verificarPermissao(groupId, senderId, messageType, textContent) {
  const config = db.get(['groups', groupId]).value() || {};
  
  // Se o sistema de cargos não está ativo, não verificar
  if (!config.cargos?.ativo) {
    return { bloqueado: false };
  }
  
  const nivel = getNivelUsuario(groupId, senderId);
  
  // Verificar permissão para links
  if (textContent && /chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(textContent)) {
    if (!temPermissaoNivel(nivel, 'links')) {
      return {
        bloqueado: true,
        motivo: `🚫 @${senderId.split('@')[0]} Você precisa ser *Ativo* (Nv 4+) para postar links!\n🎖️ Seu cargo atual: ${getPatente(nivel)}`
      };
    }
  }
  
  // Verificar permissão para links genéricos
  if (textContent && /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i.test(textContent)) {
    if (!temPermissaoNivel(nivel, 'links')) {
      return {
        bloqueado: true,
        motivo: `🚫 @${senderId.split('@')[0]} Você precisa ser *Ativo* (Nv 4+) para postar links!\n🎖️ Seu cargo atual: ${getPatente(nivel)}`
      };
    }
  }
  
  // Mapear tipo de mensagem para permissão
  const tipoPermissaoMap = {
    imageMessage: 'imagens',
    videoMessage: 'videos',
    audioMessage: 'imagens', // áudio usa mesma permissão de imagem
    stickerMessage: 'stickers',
    documentMessage: 'documentos',
    documentWithCaptionMessage: 'documentos'
  };
  
  const permissaoNecessaria = tipoPermissaoMap[messageType];
  
  if (permissaoNecessaria && !temPermissaoNivel(nivel, permissaoNecessaria)) {
    const nomesPermissao = {
      imagens: 'Membro Fiel (Nv 7+)',
      videos: 'Veterano (Nv 11+)',
      stickers: 'Mestre (Nv 21+)',
      documentos: 'Elite (Nv 16+)'
    };
    
    return {
      bloqueado: true,
      motivo: `🚫 @${senderId.split('@')[0]} Você precisa ser *${nomesPermissao[permissaoNecessaria]}* para enviar ${permissaoNecessaria}!\n🎖️ Seu cargo atual: ${getPatente(nivel)}`
    };
  }
  
  return { bloqueado: false };
}

module.exports = {
  getNivelUsuario,
  temPermissaoNivel,
  verificarPermissao,
  CARGOS_PERMISSOES
};
