const axios = require('axios');

// Cache de localizações para coordenadas
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

module.exports = {
  name: 'clima',
  aliases: ['previsao', 'weather', 'tempo'],
  adminOnly: false,

  async execute({ sock, groupId, msg, reply, args }) {
    let cidade = args.join(' ');
    
    if (!cidade) {
      return reply('⚠️ Use: #clima <cidade>\nExemplo: #clima São Paulo\n\nCidades disponíveis:\n' + 
        Object.values(coordenadasCache).map(c => c.nome.split(',')[0]).join(', '));
    }

    // Normalizar nome da cidade
    const cidadeLower = cidade.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
    // Buscar coordenadas
    let coords = null;
    let nomeCidade = '';
  
    for (const [chave, valor] of Object.entries(coordenadasCache)) {
      const chaveLower = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cidadeLower.includes(chaveLower) || chaveLower.includes(cidadeLower)) {
        coords = { lat: valor.lat, lon: valor.lon };
        nomeCidade = valor.nome;
        break;
      }
    }

    if (!coords) {
      return reply(`⚠️ Cidade "${cidade}" não encontrada.\n\nCidades disponíveis:\n` + 
        Object.values(coordenadasCache).map(c => c.nome.split(',')[0]).join(', '));
    }

    try {
      // Buscar dados do Open-Meteo
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,weathercode&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,weathercode&timezone=America%2FSao_Paulo&forecast_days=3`;
      
      const res = await axios.get(url, { timeout: 10000 });
      const dados = res.data;

      if (!dados.current_weather) {
        return reply('⚠️ Não foi possível obter dados climáticos para esta cidade.');
      }

      const atual = dados.current_weather;
      const condicao = traduzirCondicao(atual.weathercode);
      
      // Dados atuais
      const temperatura = Math.round(atual.temperature);
      const vento = Math.round(atual.windspeed);
      const umidade = dados.hourly?.relativehumidity_2m?.[new Date().getHours()] || 'N/A';
      const precipitacao = dados.hourly?.precipitation_probability?.[new Date().getHours()] || 'N/A';

      // Previsão para os próximos dias
      let previsao = '';
      const hoje = new Date();
      const nomesDias = ['Hoje', 'Amanhã', 'Depois de amanhã'];
      
      for (let i = 0; i < 3; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() + i);
        const tempMax = Math.round(dados.daily.temperature_2m_max[i]);
        const tempMin = Math.round(dados.daily.temperature_2m_min[i]);
        const chuva = dados.daily.precipitation_sum[i];
        const condicaoDia = traduzirCondicao(dados.daily.weathercode[i]);
        
        previsao += `\n${nomesDias[i]} (${data.getDate()}/${data.getMonth()+1}):\n`;
        previsao += `   ${condicaoDia.emoji} ${condicaoDia.desc}\n`;
        previsao += `   🌡️ ${tempMax}°C / ${tempMin}°C | 💧 ${chuva}mm`;
      }

      const texto = `🌍 *Clima em ${nomeCidade}*

${condicao.emoji} *Agora:*
🌡️ Temperatura: ${temperatura}°C
💨 Vento: ${vento} km/h
💧 Umidade: ${umidade}%
🌧️ Precipitação: ${precipitacao}%

📅 *Próximos dias:*${previsao}

🌅 Nascer do sol: ${new Date(dados.daily.sunrise[0]).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
🌇 Pôr do sol: ${new Date(dados.daily.sunset[0]).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;

      return reply(texto);
    } catch (err) {
      console.error('[clima] Erro:', err.message);
      return reply('⚠️ Erro ao obter dados climáticos. Tente novamente mais tarde.');
    }
  }
};
