const axios = require('axios');

module.exports = {
  name: 'cotacao',
  aliases: ['cotacoes', 'cambio', 'dolar', 'euro'],
  adminOnly: false,

  async execute({ reply, args }) {
    let moeda = (args[0] || 'USD').toUpperCase();
    
    // Se o usuário enviou "dólar", "euro", etc., mapear para código
    const moedas = {
      'DOLAR': 'USD',
      'DÓLAR': 'USD',
      'EURO': 'EUR',
      'LIBRA': 'GBP',
      'PESO': 'ARS',
      'BITCOIN': 'BTC',
      'BTC': 'BTC',
      'ETHEREUM': 'ETH',
      'ETH': 'ETH',
      'YEN': 'JPY',
      'IENE': 'JPY',
      'FRANCO': 'CHF',
      'CANADENSE': 'CAD',
      'AUSTRALIANO': 'AUD'
    };

    if (moedas[moeda]) {
      moeda = moedas[moeda];
    }

    const moedasSuportadas = ['USD', 'EUR', 'GBP', 'ARS', 'BTC', 'ETH', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'MXN', 'CLP', 'UYU', 'PEN', 'BOB', 'COP'];
    
    if (!moedasSuportadas.includes(moeda)) {
      return reply(`⚠️ Moeda "${moeda}" não suportada.\n\nMoedas disponíveis:\n${moedasSuportadas.join(', ')}`);
    }

    try {
      const url = `https://economia.awesomeapi.com.br/json/last/${moeda}-BRL`;
      const res = await axios.get(url, { timeout: 10000 });
      const dados = res.data;

      if (!dados || Object.keys(dados).length === 0) {
        return reply('⚠️ Não foi possível obter a cotação. Tente novamente.');
      }

      const par = dados[Object.keys(dados)[0]];
      const valorAtual = parseFloat(par.bid);
      const valorMax = parseFloat(par.high);
      const valorMin = parseFloat(par.low);
      const variacao = parseFloat(par.pChange);
      const dataAtualizacao = new Date(par.create_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      // Emoji baseado na variação
      const emojiVariacao = variacao >= 0 ? '📈' : '📉';
      const corVariacao = variacao >= 0 ? '🟢' : '🔴';

      // Símbolos de moedas
      const simbolos = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'ARS': '$',
        'BTC': '₿',
        'ETH': 'Ξ',
        'JPY': '¥',
        'CHF': 'CHF',
        'CAD': 'C$',
        'AUD': 'A$',
        'CNY': '¥',
        'MXN': '$',
        'CLP': '$',
        'UYU': '$',
        'PEN': 'S/',
        'BOB': 'Bs',
        'COP': '$'
      };

      const simbolo = simbolos[moeda] || '';
      const nomeMoeda = par.name?.split('/')[0] || moeda;

      const texto = `💱 *Cotação: ${moeda}/BRL*

${corVariacao} *Valor atual:* R$ ${valorAtual.toFixed(2)}
${emojiVariacao} *Variação:* ${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)}%

📊 *Máxima:* R$ ${valorMax.toFixed(2)}
📊 *Mínima:* R$ ${valorMin.toFixed(2)}

📅 Atualizado: ${dataAtualizacao}

💵 1 ${moeda} = R$ ${valorAtual.toFixed(2)}`;

      return reply(texto);
    } catch (err) {
      console.error('[cotacao] Erro:', err.message);
      return reply('⚠️ Erro ao obter cotação. Tente novamente mais tarde.');
    }
  }
};
