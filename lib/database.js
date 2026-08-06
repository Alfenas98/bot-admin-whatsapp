const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const { storageDir } = require('./storage');
const { validateGroupConfig } = require('./schema');

const databaseDir = path.join(storageDir, 'database');
if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true });

const adapter = new FileSync(path.join(databaseDir, 'db.json'));
const db = low(adapter);

// Estrutura inicial do banco
db.defaults({ groups: {}, users: {}, runtime: {} }).write();

const DEFAULT_GROUP_CONFIG = {
  antilink: false,
  antilinkhard: false,
  antimidia: {
    imagem: false,
    video: false,
    audio: false,
    sticker: false,
    documento: false
  },
  antifake: false,
  ddiPermitidos: ['55'],
  antipalavrao: false,
  palavroes: ['porra', 'caralho', 'buceta', 'puta'],
  antienquete: false,
  anticontato: false,
  x9: false,
  antifloodFigurinha: { ativo: false, limite: 10, tempoSegundos: 10 },
  limiteCaracteres: { ativo: false, limite: 500 },
  soAdmin: false,
  boasvindas: {
    ativo: false,
    mensagem: 'Bem-vindo(a) ao grupo, @user! 🎉',
    imagens: []
  },
  saida: {
    ativo: false,
    mensagem: 'Até mais, @user 👋'
  },
  levelSystem: false,
  autosticker: false,
  autoresposta: { ativo: false, gatilhos: {} },
  inatividade: { ativo: false, diasLimite: 30 },
  antispamRepetido: { ativo: false, limite: 3 },
  antimarcacaomassa: { ativo: false, limite: 5 },
  warnSystem: { ativo: false, limiteWarns: 3 },
  whitelistLinks: [],
  anticlone: false,
  prefixos: ['#'],
  jogos: {
    estado: 'idle',
    jogoAtual: null,
    figurinhas: {},
    perguntasCustom: {}
  },
  apenasAdminUsaComandos: false,
  agendamentos: [],
  auditoria: { ativo: false, destino: null },
  alertaMudancaGrupo: false,
  broadcast: { podeEnviar: false, receber: false },
  zoeiraNovato: { ativo: false, frasesCustom: [] }
};

function mergeDefaults(saved, defaults) {
  if (!saved) return { ...defaults };
  
  const result = { ...saved };
  
  for (const key of Object.keys(defaults)) {
    if (!(key in result)) {
      result[key] = defaults[key];
    } else if (
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key]) &&
      defaults[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      result[key] !== null
    ) {
      result[key] = mergeDefaults(result[key], defaults[key]);
    }
  }
  
  return result;
}

function getGroupConfig(groupId) {
  const existing = db.get(['groups', groupId]).value();

  if (!existing) {
    db.set(['groups', groupId], { ...DEFAULT_GROUP_CONFIG }).write();
    return db.get(['groups', groupId]).value();
  }

  const merged = mergeDefaults(existing, DEFAULT_GROUP_CONFIG);
  const validation = validateGroupConfig(merged);
  
  if (!validation.valid) {
    console.warn(`[database] Config do grupo ${groupId} está incompleta. Campos faltando: ${validation.missing.join(', ')}. Reconstruindo com defaults.`);
    const rebuilt = mergeDefaults(merged, DEFAULT_GROUP_CONFIG);
    db.set(['groups', groupId], rebuilt).write();
    return db.get(['groups', groupId]).value();
  }

  db.set(['groups', groupId], merged).write();
  return merged;
}

function setGroupConfig(groupId, keyPath, value) {
  getGroupConfig(groupId); // garante que o grupo existe e está atualizado
  db.set(['groups', groupId, ...keyPath.split('.')], value).write();
  return db.get(['groups', groupId]).value();
}

module.exports = { db, getGroupConfig, setGroupConfig, DEFAULT_GROUP_CONFIG };
