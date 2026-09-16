const axios = require('axios');

// Cache de coordenadas (evita buscar na API toda hora)
const coordsCache = new Map();
const climaCache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutos

// Cidades pré-configuradas (resposta instantânea)
const coordenadasCache = {
  'são paulo': { lat: -23.5505, lon: -46.6333, nome: 'São Paulo, SP' },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729, nome: 'Rio de Janeiro, RJ' },
  'brasília': { lat: -15.7975, lon: -47.8919, nome: 'Brasília, DF' },
  'belo horizonte': { lat: -19.9167, lon: -43.9345, nome: 'Belo Horizonte, MG' },
  'curitiba': { lat: -25.4284, lon: -49.2733, nome: 'Curitiba, PR' },
  'porto alegre': { lat: -30.0346, lon: -51.2177, nome: 'Porto Alegre, RS' },
  'salvador': { lat: -12.9714, lon: -38.5124, nome: 'Salvador, BA' },
  'recife': { lat: -8.0476, lon: -34.8770, nome: 'Recife, PE' },
  'fortaleza': { lat: -3.7172, lon: -38.5433, nome: 'Fortaleza, CE' },
  'manaus': { lat: -3.1190, lon: -60.0217, nome: 'Manaus, AM' },
  'natal': { lat: -5.7945, lon: -35.2110, nome: 'Natal, RN' },
  'goiânia': { lat: -16.6869, lon: -49.2648, nome: 'Goiânia, GO' },
  'belém': { lat: -1.4558, lon: -48.5024, nome: 'Belém, PA' },
  'campo grande': { lat: -20.4697, lon: -54.6201, nome: 'Campo Grande, MS' },
  'são luís': { lat: -2.5297, lon: -44.2825, nome: 'São Luís, MA' },
  'teresina': { lat: -5.0892, lon: -42.8019, nome: 'Teresina, PI' },
  'joão pessoa': { lat: -7.1195, lon: -34.8450, nome: 'João Pessoa, PB' },
  'maceió': { lat: -9.6658, lon: -35.7353, nome: 'Maceió, AL' },
  'aracaju': { lat: -10.9111, lon: -37.0717, nome: 'Aracaju, SE' },
  'florianópolis': { lat: -27.5954, lon: -48.5480, nome: 'Florianópolis, SC' },
  'vitória': { lat: -20.3155, lon: -40.3128, nome: 'Vitória, ES' },
  'macapá': { lat: 0.0356, lon: -51.0706, nome: 'Macapá, AP' },
  'rio branco': { lat: -9.9754, lon: -67.8249, nome: 'Rio Branco, AC' },
  'porto velho': { lat: -8.7612, lon: -63.9039, nome: 'Porto Velho, RO' },
  'boa vista': { lat: 2.8195, lon: -60.6714, nome: 'Boa Vista, RR' },
  'palmas': { lat: -10.1753, lon: -48.3333, nome: 'Palmas, TO' }
};

// Mapear condições climáticas por código WMO
function traduzirCondicao(codigo) {
  const cod = Number(codigo);
  if (cod === 0) return { emoji: '☀️', desc: 'Céu limpo' };
  if (cod === 1) return { emoji: '🌤️', desc: 'Principalmente claro' };
  if (cod === 2) return { emoji: '⛅', desc: 'Parcialmente nublado' };
  if (cod === 3) return { emoji: '☁️', desc: 'Nublado' };
  if (cod === 45 || cod === 48) return { emoji: '🌫️', desc: 'Nevoeiro' };
  if (cod === 51 || cod === 53 || cod === 55) return { emoji: '🌦️', desc: 'Garoa' };
  if (cod === 56 || cod === 57) return { emoji: '🌨️', desc: 'Garoa congelante' };
  if (cod === 61 || cod === 63 || cod === 65) return { emoji: '🌧️', desc: 'Chuva' };
  if (cod === 66 || cod === 67) return { emoji: '🌨️', desc: 'Chuva congelante' };
  if (cod === 71 || cod === 73 || cod === 75) return { emoji: '❄️', desc: 'Neve' };
  if (cod === 77) return { emoji: '🌨️', desc: 'Grãos de neve' };
  if (cod === 80 || cod === 81 || cod === 82) return { emoji: '🌦️', desc: 'Chuvas isoladas' };
  if (cod === 85 || cod === 86) return { emoji: '❄️', desc: 'Neve isolada' };
  if (cod === 95) return { emoji: '⛈️', desc: 'Tempestade' };
  if (cod === 96 || cod === 99) return { emoji: '⛈️', desc: 'Tempestade com granizo' };
  return { emoji: '🌡️', desc: 'Indisponível' };
}

// Verificar se é CEP (formato 00000-000 ou 00000000)
function ehCEP(texto) {
  return /^\d{5}-?\d{3}$/.test(texto.trim());
}

// Buscar coordenadas via Nominatim (OpenStreetMap) - GRATUITO
async function buscarCoordenadas(query) {
  // Verificar cache primeiro
  const cacheKey = query.toLowerCase();
  if (coordsCache.has(cacheKey)) {
    const cached = coordsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }
  }

  try {
    // Tentar CEP primeiro (via Nominatim com country=Brasil)
    let url;
    if (ehCEP(query)) {
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=br&limit=1`;
    } else {
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${query},Brasil&countrycodes=br&limit=1`;
    }

    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'WhatsAppGroupBot/1.0' }
    });

    if (res.data && res.data.length > 0) {
      const resultado = {
        lat: parseFloat(res.data[0].lat),
        lon: parseFloat(res.data[0].lon),
        nome: res.data[0].display_name?.split(',')[0] || query
      };

      // Salvar no cache
      coordsCache.set(cacheKey, { data: resultado, timestamp: Date.now() });

      // Rate limit do Nominatim (1 req/seg)
      await new Promise(resolve => setTimeout(resolve, 1100));

      return resultado;
    }
  } catch (err) {
    console.error('[clima] Erro Nominatim:', err.message);
  }

  return null;
}

module.exports = {
  name: 'clima',
  aliases: ['previsao', 'weather', 'tempo'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    if (!args || args.length === 0) {
      return reply('⚠️ Use: #clima <cidade ou CEP>\n\nExemplos:\n#clima São Paulo\n#clima 01001-000\n#clima Rio de Janeiro\n\nAliases: #previsao, #tempo');
    }

    const query = args.join(' ');
    const cidadeLower = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Verificar se é CEP e obter nome amigável
    let nomeAmigavel = query;
    if (ehCEP(query)) {
      try {
        const urlCep = `https://viacep.com.br/ws/${query.replace('-', '')}/json/`;
        const resCep = await axios.get(urlCep, { timeout: 10000 });
        if (resCep.data && !resCep.data.erro) {
          nomeAmigavel = `${resCep.data.localidade}, ${resCep.data.uf}`;
        }
      } catch (e) {}
    }

    // Verificar cache de clima
    const climaCacheKey = cidadeLower;
    if (climaCache.has(climaCacheKey)) {
      const cached = climaCache.get(climaCacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return reply(cached.data);
      }
    }

    try {
      // Buscar coordenadas
      let coords = null;

      // 1. Verificar cidades pré-configuradas
      for (const [chave, valor] of Object.entries(coordenadasCache)) {
        const chaveLower = chave.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (cidadeLower.includes(chaveLower) || chaveLower.includes(cidadeLower)) {
          coords = valor;
          break;
        }
      }

      // 2. Se não encontrou, buscar via Nominatim
      if (!coords) {
        coords = await buscarCoordenadas(query);
      }

      // 3. Se ainda não encontrou, usar Open-Meteo sem geocoding
      if (!coords) {
        return reply(`⚠️ Cidade "${query}" não encontrada.\n\nTente:\n#clima São Paulo\n#clima 01001-000 (CEP)\n#clima Rio de Janeiro`);
      }

      // Buscar dados do clima (Open-Meteo)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,weathercode&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,weathercode,precipitation_probability_max&timezone=America%2FSao_Paulo&forecast_days=7`;

      const res = await axios.get(url, { timeout: 15000 });
      const dados = res.data;

      if (!dados.current_weather) {
        return reply('⚠️ Não foi possível obter dados climáticos no momento. Tente novamente.');
      }

      const atual = dados.current_weather;
      const condicaoAtual = traduzirCondicao(atual.weathercode);
      const temperatura = Math.round(atual.temperature);
      const vento = Math.round(atual.windspeed);
      const umidade = dados.hourly?.relativehumidity_2m?.[new Date().getHours()] || 'N/A';
      const precipitacaoAtual = dados.hourly?.precipitation_probability?.[new Date().getHours()] || 0;

      // Verificar alertas
      let alertas = [];
      if (atual.weathercode >= 95) alertas.push('⛈️ ALERTA DE TEMPESTADE!');
      if (temperatura >= 40) alertas.push('🔥 ALERTA DE CALOR EXTREMO!');
      if (temperatura <= 5) alertas.push('❄️ ALERTA DE FRIO EXTREMO!');
      if (precipitacaoAtual >= 80) alertas.push('🌧️ CHUVA INTENSA!');

      // Construir previsão 7 dias
      let previsao = '';
      const hoje = new Date();
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 0; i < 7; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() + i);
        const tempMax = Math.round(dados.daily.temperature_2m_max[i]);
        const tempMin = Math.round(dados.daily.temperature_2m_min[i]);
        const chuva = dados.daily.precipitation_sum[i];
        const probChuva = dados.daily.precipitation_probability_max[i] || 0;
        const condicaoDia = traduzirCondicao(dados.daily.weathercode[i]);
        const dia = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : diasSemana[data.getDay()];

        previsao += `\n${dia} (${data.getDate()}/${data.getMonth()+1}): ${condicaoDia.emoji} ${tempMax}°/${tempMin}° | 💧 ${probChuva}%`;
      }

      // Formatar resposta
      let texto = `🌍 *Clima em ${coords.nome}*

${condicaoAtual.emoji} *Agora:*
🌡️ Temperatura: ${temperatura}°C
💨 Vento: ${vento} km/h
💧 Umidade: ${umidade}%
🌧️ Precipitação: ${precipitacaoAtual}%

📅 *Próximos 7 dias:*${previsao}`;

      // Adicionar alertas se houver
      if (alertas.length > 0) {
        texto += `\n\n⚠️ *ALERTAS:*`;
        alertas.forEach(a => { texto += `\n${a}`; });
      }

      // Adicionar nascer/pôr do sol
      if (dados.daily.sunrise && dados.daily.sunset) {
        texto += `\n\n🌅 Nascer do sol: ${new Date(dados.daily.sunrise[0]).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
        texto += `\n🌇 Pôr do sol: ${new Date(dados.daily.sunset[0]).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
      }

      // Salvar no cache
      climaCache.set(climaCacheKey, { data: texto, timestamp: Date.now() });

      return reply(texto);
    } catch (err) {
      console.error('[clima] Erro:', err.message);
      return reply('⚠️ Erro ao obter dados climáticos. Tente novamente mais tarde.');
    }
  }
};
