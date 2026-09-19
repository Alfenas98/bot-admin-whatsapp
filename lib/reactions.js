/**
 * Sistema de Reação Automática com Emojis
 * 
 * Reage a mensagens com emojis baseados em palavras-chave.
 * Admins podem configurar quais palavras reagem com quais emojis.
 * 
 * Exemplo:
 * "Brasil foi campeão" → Reage com 🇧🇷
 * "que dia lindo" → Reage com ☀️
 */

const REACOES_PADRAO = {
  // Países
  'brasil': '🇧🇷',
  'brazil': '🇧🇷',
  'argentina': '🇦🇷',
  'eua': '🇺🇸',
  'usa': '🇺🇸',
  'portugal': '🇵🇹',
  'japao': '🇯🇵',
  'japan': '🇯🇵',
  'china': '🇨🇳',
  'frança': '🇫🇷',
  'franca': '🇫🇷',
  'alemanha': '🇩🇪',
  'espanha': '🇪🇸',
  'italia': '🇮🇹',
  'inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  
  // Times (exemplos)
  'corinthians': '⚫⚪',
  'palmeiras': '🟢⚪',
  'flamengo': '🔴⚫',
  'são paulo': '🔴⚪🔵',
  'santos': '⚪⚫',
  'vasco': '⚫⚪',
  'cruzeiro': '🔵⚪',
  'atlético': '⚫⚪',
  'gremio': '🔵⚫⚪',
  'internacional': '🔴⚪',
  'botafogo': '⚫⚪',
  'fluminense': '🔴🟢⚪',
  
  // Emoções/Situações
  'feliz': '😊',
  'triste': '😢',
  'amor': '❤️',
  'ódio': '😡',
  'raiva': '😡',
  'medo': '😨',
  'surpresa': '😮',
  'paz': '✌️',
  'obrigado': '🙏',
  'valeu': '👍',
  'top': '🔥',
  'bombou': '💥',
  'lixo': '🗑️',
  'bomba': '💣',
  'fogo': '🔥',
  'água': '💧',
  'sol': '☀️',
  'lua': '🌙',
  'estrela': '⭐',
  'dinheiro': '💰',
  'trabalho': '💼',
  'estudo': '📚',
  'comida': '🍕',
  'cerveja': '🍺',
  'café': '☕',
  
  // Animais
  'cachorro': '🐕',
  'gato': '🐱',
  'pássaro': '🐦',
  'peixe': '🐟',
  'cobra': '🐍',
  'leão': '🦁',
  'tigre': '🐯',
  'urso': '🐻',
  'coelho': '🐰',
  'macaco': '🐵',
  
  // Comidas
  'pizza': '🍕',
  'hamburguer': '🍔',
  'sushi': '🍣',
  'bolo': '🎂',
  'chocolate': '🍫',
  'fruta': '🍎',
  'carne': '🥩',
  'arroz': '🍚',
  'feijão': '🫘',
  
  // Tecnologia
  'celular': '📱',
  'computador': '💻',
  'internet': '🌐',
  'jogo': '🎮',
  'música': '🎵',
  'filme': '🎬',
  'foto': '📸',
  'vídeo': '📹',
  'notícia': '📰',
  
  // Transporte
  'carro': '🚗',
  'moto': '🏍️',
  'avião': '✈️',
  'trem': '🚂',
  'ônibus': '🚌',
  'bicicleta': '🚲',
  
  // Natureza
  'chuva': '🌧️',
  'sol': '☀️',
  'vento': '💨',
  'terra': '🌍',
  'fogo': '🔥',
  'água': '💧',
  'ar': '💨',
  
  // Outros
  'aniversário': '🎂',
  'natal': '🎄',
  'ano novo': '🎆',
  'carnaval': '🎭',
  'páscoa': '🐣',
  'halloween': '🎃',
  'férias': '🏖️',
};

/**
 * Verifica se uma palavra-chave está na mensagem
 */
function palavraNaMensagem(mensagem, palavra) {
  const msgLower = mensagem.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const palavraLower = palavra.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  
  // Verificar como palavra isolada (não dentro de outra palavra)
  const regex = new RegExp(`\\b${palavraLower}\\b`, 'i');
  return regex.test(msgLower);
}

/**
 * Encontra todas as palavras-chave na mensagem e retorna os emojis
 */
function encontrarReacoes(mensagem, reacoes) {
  const emojis = new Set();
  
  for (const [palavra, emoji] of Object.entries(reacoes)) {
    if (palavraNaMensagem(mensagem, palavra)) {
      // Adicionar cada emoji separadamente (pode ser mais de um)
      for (const e of emoji) {
        emojis.add(e);
      }
    }
  }
  
  return Array.from(emojis);
}

/**
 * Processa reações para uma mensagem
 * @param {object} sock - Socket do WhatsApp
 * @param {string} groupId - ID do grupo
 * @param {object} key - Chave da mensagem
 * @param {string} texto - Texto da mensagem
 * @param {object} config - Configurações do grupo
 * @param {string} reacoesCustomizadas - Reações customizadas (JSON string)
 */
async function processarReacoes(sock, groupId, key, texto, config, reacoesCustomizadas) {
  try {
    // Verificar se reações estão ativas
    if (!config.reacoesAutomaticas?.ativo) return;
    
    if (!texto || texto.startsWith('#')) return;
    
    // Mesclar reações padrão com customizadas
    const todasReacoes = {
      ...REACOES_PADRAO,
      ...(reacoesCustomizadas || {})
    };
    
    const emojis = encontrarReacoes(texto, todasReacoes);
    
    if (emojis.length === 0) return;
    
    // Reagir a mensagem com os emojis (limite de 3)
    const emojisParaReagir = emojis.slice(0, 3);
    
    for (const emoji of emojisParaReagir) {
      try {
        await sock.sendMessage(groupId, {
          react: { key, text: emoji }
        });
        // Delay entre reações
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.log(`[reacoes] Erro ao reagir com ${emoji}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[reacoes] Erro geral:', e.message);
  }
}

module.exports = {
  processarReacoes,
  encontrarReacoes,
  palavraNaMensagem,
  REACOES_PADRAO
};