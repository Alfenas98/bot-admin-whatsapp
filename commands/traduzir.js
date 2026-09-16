const axios = require('axios');
const { getGroupConfig } = require('../lib/database');

// Cache de últimas mensagens para tradução rápida
const messageCache = new Map();

// Função para limpar mensagens antigas do cache (5 min)
setInterval(() => {
  const agora = Date.now();
  for (const [key, val] of messageCache.entries()) {
    if (agora - val.timestamp > 300000) messageCache.delete(key);
  }
}, 60000);

module.exports = {
  name: 'traduzir',
  aliases: ['traduz', 'translate', 'trad'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply }) {
    const config = getGroupConfig(groupId);
    
    // Verificar se é uma resposta a outra mensagem
    const mensagemRespondida = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mensagemRespondidaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    
    let textoParaTraduzir = '';
    
    if (mensagemRespondida) {
      // Extrair texto da mensagem respondida
      if (mensagemRespondida.conversation) {
        textoParaTraduzir = mensagemRespondida.conversation;
      } else if (mensagemRespondida.extendedTextMessage?.text) {
        textoParaTraduzir = mensagemRespondida.extendedTextMessage.text;
      } else {
        return reply('⚠️ A mensagem respondida não contém texto para traduzir.');
      }
    } else {
      // Verificar cache de mensagens recentes
      const cached = messageCache.get(groupId);
      if (cached && cached.text) {
        textoParaTraduzir = cached.text;
      } else {
        return reply('⚠️ Responda a uma mensagem com #traduzir para traduzir o texto.\n\nOu envie o texto após o comando: #traduzir <texto>');
      }
    }

    if (!textoParaTraduzir.trim()) {
      return reply('⚠️ Nenhum texto encontrado para traduzir.');
    }

    // Limitar tamanho
    if (textoParaTraduzir.length > 500) {
      textoParaTraduzir = textoParaTraduzir.substring(0, 500) + '...';
    }

    try {
      // Traduzir usando MyMemory
      const urlTraducao = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoParaTraduzir)}&langpair=en|pt-BR`;
      
      const res = await axios.get(urlTraducao, { timeout: 10000 });
      
      // Usar a melhor tradução dos matches (ordem de qualidade)
      const matches = res.data?.matches || [];
      const melhorTraducao = matches.length > 0 
        ? matches.sort((a, b) => b.quality - a.quality)[0].translation 
        : res.data?.responseData?.translatedText;
      
      if (!melhorTraducao) {
        return reply('⚠️ Não foi possível traduzir a mensagem. Tente novamente.');
      }
      
      // Detectar idioma de origem
      const idiomaDetectado = matches.length > 0 ? matches[0].source : 'unknown';
      const idiomaCodigo = idiomaDetectado.split('-')[0].toLowerCase();
      
      const idiomaNome = idiomaCodigo === 'en' ? 'Inglês' : 
                        idiomaCodigo === 'es' ? 'Espanhol' :
                        idiomaCodigo === 'fr' ? 'Francês' :
                        idiomaCodigo === 'de' ? 'Alemão' :
                        idiomaCodigo === 'it' ? 'Italiano' :
                        idiomaCodigo === 'ja' ? 'Japonês' :
                        idiomaCodigo === 'ko' ? 'Coreano' :
                        idiomaCodigo === 'zh' ? 'Chinês' :
                        idiomaCodigo === 'pt' ? 'Português' :
                        idiomaCodigo || 'Desconhecido';
      
      const textoTraduzido = `🇧🇷 *Tradução para Português-BR:*

_${melhorTraducao}_

🌐 Idioma detectado: ${idiomaNome}`;

      return reply(textoTraduzido);
    } catch (err) {
      console.error('[traduzir] Erro:', err.message);
      return reply('⚠️ Erro ao traduzir. Verifique se o texto não é muito longo.');
    }
  }
};
