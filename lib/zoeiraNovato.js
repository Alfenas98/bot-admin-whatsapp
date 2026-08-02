const NOMES_MASCULINOS = require('./nomesMasculinos');
const { db } = require('./database');

function jaFoiZoado(groupId, userId) {
  return db.get(['users', groupId, userId, 'zoeiraAplicada']).value() === true;
}

function marcarComoZoado(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  db.set(path, { ...existing, zoeiraAplicada: true }).write();
}

function normalizar(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim();
}

function extrairPrimeiroNome(pushName) {
  if (!pushName) return null;
  const partes = normalizar(pushName).split(/\s+/).filter(Boolean);
  return partes[0] || null;
}

/**
 * Aproximação por nome — NÃO é detecção real de gênero (isso não existe
 * via WhatsApp). Vai errar em nomes fora da lista, apelidos, emojis como
 * nome de exibição, ou nomes estrangeiros.
 */
function pareceMasculino(pushName) {
  const primeiroNome = extrairPrimeiroNome(pushName);
  if (!primeiroNome) return false;
  return NOMES_MASCULINOS.has(primeiroNome);
}

const PADROES_APRESENTACAO = [
  /meu nome e/,
  /me chamo/,
  /\bsou (o |a )?\w+/,
  /\boi,? sou\b/,
  /\bola,? sou\b/,
  /\bprazer\b/,
  /\bnov[oa] (aqui|no grupo)\b/,
  /\bacabei de entrar\b/,
  /\bcheguei\b/,
  /\bentrando (agora)?\b/,
  /\bprimeira vez (aqui|no grupo)\b/,
  /\bme apresentando\b/,
  /\bapresenta[cç][aã]o\b/
];

/**
 * Detecta se o texto parece uma apresentação (baseado em padrões comuns
 * em português — também é uma aproximação, não é infalível).
 */
function pareceApresentacao(texto) {
  const normalizado = normalizar(texto);
  if (!normalizado) return false;
  return PADROES_APRESENTACAO.some(padrao => padrao.test(normalizado));
}

const FRASES_ZOEIRA = [
  'Opa, chegou mais um! @user, já se prepara que aqui não tem dó não 😂',
  'E lá vem @user chegando com aquela cara de "sou gente boa"... vamo ver quanto tempo dura 👀',
  'Firmeza, @user! Bem-vindo, mas saiba que o grupo já tá de olho em você 🔍',
  '@user chegou! Alguém avisa que aqui a zoeira é livre, é só não levar pro pessoal 😄',
  'Mais um bravo que apareceu, @user! Vamo ver se aguenta o tranco por aqui 💪',
  '@user entrando tranquilo igual quem não sabe que vai ser zoado em 3... 2... 1...',
  'Salve @user! Já pode ir se acostumando, aqui é assim com todo mundo 😂',
  'Cadê a festa? Chegou @user! Bora ver se ele tem resistência pro grupo 🎉',
  '@user na área! Relaxa que é só carinho (mentira, é zoeira mesmo) 😂',
  'E aí, @user, já sabe as regras? Não sabe? Melhor ainda 😏'
];

function sortearFrase(frasesCustom) {
  const lista = frasesCustom && frasesCustom.length > 0 ? frasesCustom : FRASES_ZOEIRA;
  return lista[Math.floor(Math.random() * lista.length)];
}

module.exports = { pareceMasculino, pareceApresentacao, extrairPrimeiroNome, sortearFrase, jaFoiZoado, marcarComoZoado };
