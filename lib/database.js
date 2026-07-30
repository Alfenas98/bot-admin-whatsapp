const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const { storageDir } = require('./storage');

const databaseDir = path.join(storageDir, 'database');
if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true });

const adapter = new FileSync(path.join(databaseDir, 'db.json'));
const db = low(adapter);

// Estrutura inicial do banco
db.defaults({ groups: {}, users: {} }).write();

const DEFAULT_GROUP_CONFIG = {
  // links
  antilink: false, // bloqueia só links de convite de grupo (chat.whatsapp.com/...)
  antilinkhard: false, // bloqueia QUALQUER link (http, www, etc)

  // mídia
  antimidia: {
    imagem: false,
    video: false,
    audio: false,
    sticker: false,
    documento: false
  },

  // segurança
  antifake: false, // bloqueia números de DDI fora da lista permitida
  ddiPermitidos: ['55'], // Brasil por padrão
  antipalavrao: false,
  palavroes: ['porra', 'caralho', 'buceta', 'puta'], // lista básica, editável
  antienquete: false,
  anticontato: false,
  x9: false, // avisa quando alguém apaga mensagem no grupo

  // flood / limites
  antifloodFigurinha: { ativo: false, limite: 10, tempoSegundos: 10 },
  limiteCaracteres: { ativo: false, limite: 500 },

  // administração
  soAdmin: false, // só admin pode mandar mensagem no grupo

  // boas-vindas / saída
  boasvindas: {
    ativo: false,
    mensagem: 'Bem-vindo(a) ao grupo, @user! 🎉',
    imagens: [] // lista de caminhos de arquivo salvos em disco
  },
  saida: {
    ativo: false,
    mensagem: 'Até mais, @user 👋'
  },

  // engajamento
  levelSystem: false,
  autosticker: false,
  autoresposta: { ativo: false, gatilhos: {} }, // { "oi": "olá, tudo bem?" }

  // inatividade
  inatividade: { ativo: false, diasLimite: 30 },

  // spam e marcação
  antispamRepetido: { ativo: false, limite: 3 }, // mesma msg repetida N vezes seguidas
  antimarcacaomassa: { ativo: false, limite: 5 }, // máx menções por mensagem

  // sistema de advertências (manual, via #warn)
  warnSystem: { ativo: false, limiteWarns: 3 },

  // números que não sofrem anti-link (ex: bot de afiliados de outro projeto)
  whitelistLinks: [],

  // aviso quando alguém entra com nome parecido ao de um admin
  anticlone: false,

  // geral
  prefixos: ['#'],

  // modo jogo
  jogos: {
    estado: 'idle', // idle | preparando | aguardando | jogando
    jogoAtual: null,
    figurinhas: {}, // { eununca: ['/caminho/1.webp', ...] }
    perguntasCustom: {} // { eununca: ['pergunta 1', 'pergunta 2', ...] } - se vazio, usa as perguntas padrão do jogo
  },

  // se true, NENHUM comando funciona pra quem não é admin do grupo
  // (sobrepõe o adminOnly individual de cada comando)
  apenasAdminUsaComandos: false
};

/**
 * Faz merge recursivo simples: preenche campos que faltarem no config salvo
 * com o valor padrão, sem sobrescrever o que já existe.
 */
function mergeDefaults(saved, defaults) {
  const result = { ...saved };
  for (const key of Object.keys(defaults)) {
    if (result[key] === undefined) {
      result[key] = defaults[key];
    } else if (
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key]) &&
      defaults[key] !== null
    ) {
      result[key] = mergeDefaults(result[key] || {}, defaults[key]);
    }
  }
  return result;
}

/**
 * Retorna a config de um grupo, criando com valores padrão se não existir,
 * e preenchendo campos novos que não existiam quando o grupo foi criado.
 */
function getGroupConfig(groupId) {
  const existing = db.get(['groups', groupId]).value();

  if (!existing) {
    db.set(['groups', groupId], { ...DEFAULT_GROUP_CONFIG }).write();
    return db.get(['groups', groupId]).value();
  }

  const merged = mergeDefaults(existing, DEFAULT_GROUP_CONFIG);
  db.set(['groups', groupId], merged).write();
  return merged;
}

/**
 * Atualiza um campo específico da config do grupo (aceita path tipo "antimidia.imagem")
 */
function setGroupConfig(groupId, keyPath, value) {
  getGroupConfig(groupId); // garante que o grupo existe e está atualizado
  db.set(['groups', groupId, ...keyPath.split('.')], value).write();
  return db.get(['groups', groupId]).value();
}

module.exports = { db, getGroupConfig, setGroupConfig, DEFAULT_GROUP_CONFIG };
