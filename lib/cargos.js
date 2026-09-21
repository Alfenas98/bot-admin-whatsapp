/**
 * Sistema de Cargos por Nível
 * 
 * Ao subir de nível, o usuário ganha:
 * - Cargos automáticos (permissões especiais)
 * - Coins como prêmio
 * 
 * Cargos:
 * - Nv 1-3: Novato (sem permissões)
 * - Nv 4-6: Ativo (postar links) + 100 coins
 * - Nv 7-10: Membro Fiel (links + imagens) + 200 coins
 * - Nv 11-15: Veterano (links + imagens + vídeos) + 500 coins
 * - Nv 16-20: Elite (+ documentos) + 1000 coins
 * - Nv 21+: Mestre (+ stickers) + 2000 coins
 * - Nv 31-50: Lenda (+ enquetes) + 5000 coins
 * - Nv 51+: Diamond (+ admin) + 10000 coins
 */

const { db } = require('./database');
const { getPatente } = require('./xp');

const CARGOS = [
  { nivel: 1, nome: 'Novato', emoji: '🆕', permissoes: [], coins: 0 },
  { nivel: 4, nome: 'Ativo', emoji: '🟢', permissoes: ['links'], coins: 100 },
  { nivel: 7, nome: 'Membro Fiel', emoji: '🔵', permissoes: ['links', 'imagens'], coins: 200 },
  { nivel: 11, nome: 'Veterano', emoji: '🟡', permissoes: ['links', 'imagens', 'videos'], coins: 500 },
  { nivel: 16, nome: 'Elite', emoji: '🟠', permissoes: ['links', 'imagens', 'videos', 'documentos'], coins: 1000 },
  { nivel: 21, nome: 'Mestre', emoji: '🔴', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers'], coins: 2000 },
  { nivel: 31, nome: 'Lenda', emoji: '👑', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers', 'enquetes'], coins: 5000 },
  { nivel: 51, nome: 'Diamond', emoji: '💎', permissoes: ['links', 'imagens', 'videos', 'documentos', 'stickers', 'enquetes', 'admin'], coins: 10000 }
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
    const mensagem = `🎉 *Promoção de Cargo!*\n\n` +
      `@${userId.split('@')[0]} foi promovido!\n\n` +
      `${cargoAntigo.emoji} ${cargoAntigo.nome} → ${cargoNovo.emoji} ${cargoNovo.nome}\n\n` +
      `💰 Prêmio: *+${cargoNovo.coins} coins*\n` +
      `📋 Novas permissões:\n${cargoNovo.permissoes.length > 0 ? cargoNovo.permissoes.map(p => `• ${p}`).join('\n') : '• Nenhuma'}`;
    
    return {
      promovido: true,
      cargoAntigo: cargoAntigo,
      cargoNovo: cargoNovo,
      coins: cargoNovo.coins,
      mensagem: mensagem
    };
  }
  
  return { promovido: false, coins: 0 };
}

module.exports = {
  getCargo,
  temPermissao,
  verificarPromocao,
  CARGOS
};
