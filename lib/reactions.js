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
  
  // Times (emoji único para evitar quadradinhos)
  'corinthians': '⚫',
  'palmeiras': '🟢',
  'flamengo': '🔴',
  'são paulo': '🔵',
  'santos': '⚪',
  'vasco': '⚫',
  'cruzeiro': '🔵',
  'atlético': '⚫',
  'gremio': '🔵',
  'internacional': '🔴',
  'botafogo': '⚫',
  'fluminense': '🟢',
  
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
  'vento': '💨',
  'terra': '🌍',
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
 */
async function processarReacoes(sock, groupId, key, texto, config) {
  try {
    // Verificar se reações estão ativas
    if (!config?.reacoesAutomaticas?.ativo) return;
    
    if (!texto || texto.startsWith('#')) return;
    
    // Mesclar reações padrão com customizadas
    const todasReacoes = {
      ...REACOES_PADRAO,
      ...(config.reacoesAutomaticas?.custom || {})
    };
    
    const emojis = encontrarReacoes(texto, todasReacoes);
    
    if (emojis.length === 0) return;
    
    // Filtrar apenas emojis válidos (evitar quadradinhos)
    const emojisValidos = emojis.filter(e => {
      // Verificar se é um emoji válido (não é string vazia ou múltiplos chars quebrados)
      if (!e || e.length === 0) return false;
      // Verificar se não contém caracteres de substituição
      if (e.includes('�')) return false;
      return true;
    });
    
    if (emojisValidos.length === 0) return;
    
    // Limitar a 1 emoji para garantir que funcione
    const emojisParaReagir = emojisValidos.slice(0, 1);
    
    for (const emoji of emojisParaReagir) {
      try {
        // Validar se é um emoji único (1-2 code points)
        const codePoints = [...emoji].length;
        if (codePoints > 2) continue;
        
        await sock.sendMessage(groupId, {
          react: {
            text: emoji.substring(0, 2), // Garantir que é um emoji curto
            key: key
          }
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.log(`[reacoes] Erro:`, e.message);
      }
    }
  } catch (e) {
    console.error('[reacoes] Erro:', e.message);
  }
}

module.exports = {
  processarReacoes,
  encontrarReacoes,
  palavraNaMensagem,
  REACOES_PADRAO
};