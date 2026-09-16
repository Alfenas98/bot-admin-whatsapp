const { getGroupConfig, setGroupConfig } = require('../lib/database');
const { salvarQuote, listarQuotes, pegarQuote, quoteAleatoria, limparQuotes } = require('../lib/quotes');

module.exports = {
  name: 'quote',
  aliases: ['citar', 'quote', 'quotes'],
  adminOnly: false,
  async execute({ sock, msg, groupId, args, reply, textContent }) {
    if (args.length === 0) {
      return reply('⚠️ Uso:\n#quote save "texto" - Salvar uma citação\n#quote list - Listar citações\n#quote get <número> - Pega citação específica\n#quote random - Citação aleatória\n#quote clear - Limpar todas');
    }

    const sub = args[0].toLowerCase();

    // Salvar citação
    if (sub === 'save' || sub === 'salvar') {
      let texto = args.slice(1).join(' ');
      if (!texto && msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        // Cita a mensagem respondida
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        texto = quoted.conversation || quoted.extendedTextMessage?.text || '';
      }
      if (!texto) {
        return reply('⚠️ Uso: #quote save "seu texto aqui" ou responda uma mensagem e use #quote save');
      }

      const autorId = msg.key.participant || msg.key.remoteJid;
      const posicao = salvarQuote(groupId, autorId, texto);
      
      await sock.sendMessage(groupId, {
        text: `✅ Citação #${posicao} salva: "${texto.substring(0, 100)}..."`
      }, { quoted: msg });
      return;
    }

    // Listar citações
    if (sub === 'list' || sub === 'lista') {
      const quotes = listarQuotes(groupId);
      if (quotes.length === 0) {
        return reply('📋 Nenhuma citação salva.');
      }

      const lista = quotes.map((q, i) => `${i + 1}. ${q.texto.substring(0, 80)}...`);
      const texto = `📋 *Citações salvas (${quotes.length}):*\n${lista.join('\n')}`;
      
      await sock.sendMessage(groupId, { text: texto }, { quoted: msg });
      return;
    }

    // Citação aleatória
    if (sub === 'random' || sub === 'aleatoria' || sub === 'r') {
      const quote = quoteAleatoria(groupId);
      if (!quote) {
        return reply('📋 Nenhuma citação salva.');
      }

      const numero = quote.autor.split('@')[0];
      await sock.sendMessage(groupId, {
        text: `💬 *Citação aleatória #${quote.id}:*\n"${quote.texto}"\n— @${numero}`,
        mentions: [quote.autor]
      }, { quoted: msg });
      return;
    }

    // Pegar citação específica
    if (sub === 'get' || sub === 'pegar') {
      const id = args[1];
      if (!id) {
        return reply('⚠️ Uso: #quote get <número da citação>');
      }

      const quote = pegarQuote(groupId, id);
      if (!quote) {
        return reply('⚠️ Citação não encontrada.');
      }

      const numero = quote.autor.split('@')[0];
      await sock.sendMessage(groupId, {
        text: `💬 *Citação #${quote.id}:*\n"${quote.texto}"\n— @${numero}`,
        mentions: [quote.autor]
      }, { quoted: msg });
      return;
    }

    // Limpar citações
    if (sub === 'clear' || sub === 'limpar') {
      limparQuotes(groupId);
      return reply('🗑️ Todas as citações foram limpas.');
    }

    return reply('⚠️ Subcomando desconhecido. Use: save, list, get, random, clear');
  }
};
