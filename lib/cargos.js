/**
 * Sistema de Cargos por Nível
 * 
 * Ao subir de nível, o usuário ganha "cargos" automáticos
 * que concedem permissões especiais no grupo.
 * 
 * Cargos:
 * - Nv 1-3: Novato (sem permissões especiais)
 * - Nv 4-6: Ativo (pode postar links)
 * - Nv 7-10: Membro Fiel (pode postar imagens)
 * - Nv 11-15: Veterano (pode postar vídeos)
 * - Nv 16-20: Elite (pode postar documentos)
 * - Nv 21+: Mestre (todas as permissões)
 */

const { db } = require('./database');
const { getPatente } = require('./xp');

const CARGOS = [
  { nivel: 1, nome: 'Novato', emoji: '🆕', permissoes: [] },
  { nivel: 4, nome: 'Ativo', emoji: '🟢', permissoes: ['links'] },
  { nivel: 7, nome: 'Membro Fiel', emoji: '🔵', permissoes: ['links', 'imagens'] },
  { nivel: 11, nome: 'Veterano', emoji: '🟡', permissoes: ['links', 'imagens', 'videos'] },
  { nivel: 16, nome: 'Elite', emoji: '🟠', permissoes: ['links', 'imagens', 'videos', 'documentos'] },
  { nivel: 21, nome: 'Mestre', emoji: '🔴', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers'] },
  { nivel: 31, nome: 'Lenda', emoji: '👑', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers', 'enquetes'] },
  { nivel: 51, nome: 'Diamond', emoji: '💎', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers', 'enquetes', 'admin'] }
];

function getCargo(nivel) {
  let cargo = CARGOS[0];
  for (const c of CARGOS) {
    if (nivel >= c.nivel) {
      cargo = c;
    }
  }
  return cargo;
}

function temPermissao(nivel, permissao) {
  const cargo = getCargo(nivel);
  return cargo.permissoes.includes(permissao);
}

function verificarPromocao(groupId, userId, nivelAntigo, nivelNovo) {
  const cargoAntigo = getCargo(nivelAntigo);
  const cargoNovo = getCargo(nivelNovo);
  
  if (cargoNovo.nivel > cargoAntigo.nivel) {
    return {
      promovido: true,
      cargoAntigo: cargoAntigo,
      cargoNovo: cargoNovo,
      mensagem: `🎉 *Promoção de Cargo!*\n\n` +
                `@${userId.split('@')[0]} foi promovido!\n\n` +
                `${cargoAntigo.emoji} ${cargoAntigo.nome} → ${cargoNovo.emoji} ${cargoNovo.nome}\n\n` +
                `📋 Novas permissões:\n${cargoNovo.permissoes.map(p => `• ${p}`).join('\n')}`
    };
  }
  
  return { promovido: false };
}

module.exports = {
  getCargo,
  temPermissao,
  verificarPromocao,
  CARGOS
};
