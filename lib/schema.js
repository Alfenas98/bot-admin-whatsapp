// Schema independente para validação de config de grupo.
// Não importa de database.js para evitar ciclo de módulos.

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

const REQUIRED_GROUP_FIELDS = Object.keys(DEFAULT_GROUP_CONFIG);

function validateGroupConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, missing: REQUIRED_GROUP_FIELDS };
  }

  const missing = [];
  for (const field of REQUIRED_GROUP_FIELDS) {
    if (!(field in config)) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

module.exports = { validateGroupConfig, REQUIRED_GROUP_FIELDS, DEFAULT_GROUP_CONFIG };
