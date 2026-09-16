const axios = require('axios');

module.exports = {
  name: 'idioma',
  aliases: ['detectar', 'lang', 'language'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    let textoParaDetectar = '';
    
    // Verificar se é uma resposta a outra mensagem
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (mensagemRespondida) {
      if (mensagemRespondida.conversation) {
        textoParaDetectar = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoParaDetectar = mensagemRespondida.extendedTextMessage.text;
      } else {
        return reply('⚠️ A mensagem respondida não contém texto para detectar.');
      }
    } else if (args.length > 0) {
      textoParaDetectar = args.join(' ');
    } else {
      return reply('⚠️ Responda a uma mensagem com #idioma ou envie o texto após o comando.\n\nExemplo: #idioma Hello world!');
    }

    if (!textoParaDetectar.trim()) {
      return reply('⚠️ Nenhum texto encontrado para detectar.');
    }

    if (textoParaDetectar.length > 500) {
      textoParaDetectar = textoParaDetectar.substring(0, 500) + '...';
    }

    try {
      // Detectar idioma usando MyMemory
      const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoParaDetectar)}&langpair=en|pt-BR`, { timeout: 10000 });
      
      const matches = res.data?.matches || [];
      let idiomaDetectado = 'unknown';
      let confianca = 0;
      
      if (matches.length > 0) {
        idiomaDetectado = matches[0].sourceLanguage || 'unknown';
        confianca = matches[0].match || 0;
      }

      // Mapear códigos para nomes legíveis
      const idiomas = {
        'en': { nome: 'Inglês', emoji: '🇺🇸' },
        'es': { nome: 'Espanhol', emoji: '🇪🇸' },
        'fr': { nome: 'Francês', emoji: '🇫🇷' },
        'de': { nome: 'Alemão', emoji: '🇩🇪' },
        'it': { nome: 'Italiano', emoji: '🇮🇹' },
        'ja': { nome: 'Japonês', emoji: '🇯🇵' },
        'ko': { nome: 'Coreano', emoji: '🇰🇷' },
        'zh': { nome: 'Chinês', emoji: '🇨🇳' },
        'ru': { nome: 'Russo', emoji: '🇷🇺' },
        'ar': { nome: 'Árabe', emoji: '🇸🇦' },
        'pt': { nome: 'Português', emoji: '🇧🇷' },
        'nl': { nome: 'Holandês', emoji: '🇳🇱' },
        'sv': { nome: 'Sueco', emoji: '🇸🇪' },
        'no': { nome: 'Norueguês', emoji: '🇳🇴' },
        'da': { nome: 'Dinamarquês', emoji: '🇩🇰' },
        'fi': { nome: 'Finlandês', emoji: '🇫🇮' },
        'pl': { nome: 'Polonês', emoji: '🇵🇱' },
        'tr': { nome: 'Turco', emoji: '🇹🇷' },
        'hi': { nome: 'Hindi', emoji: '🇮🇳' },
        'th': { nome: 'Tailandês', emoji: '🇹🇭' },
        'vi': { nome: 'Vietnamita', emoji: '🇻🇳' },
        'id': { nome: 'Indonésio', emoji: '🇮🇩' },
        'ms': { nome: 'Malaio', emoji: '🇲🇾' }
      };

      const info = idiomas[idiomaDetectado] || { nome: idiomaDetectado.toUpperCase(), emoji: '🌐' };
      
      const resultado = `🔍 *Detecção de Idioma*

${info.emoji} Idioma: *${info.nome}*
📊 Confianca: ${(confianca * 100).toFixed(0)}%

📝 Texto analisado: _"${textoParaDetectar.substring(0, 100)}${textoParaDetectar.length > 100 ? '...' : ''}"_`;

      return reply(resultado);
    } catch (err) {
      console.error('[idioma] Erro:', err.message);
      return reply('⚠️ Erro ao detectar idioma. Tente novamente.');
    }
  }
};
