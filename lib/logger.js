/**
 * Sistema de Logs Estruturado
 * 
 * Logs com níveis: ERROR, WARN, INFO, DEBUG
 * Salva em arquivo e exibe no console
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, `bot-${new Date().toISOString().split('T')[0]}.log`);

const NIVEIS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const NIVEL_ATUAL = NIVEIS[process.env.LOG_LEVEL || 'INFO'];

function formatarLog(nivel, mensagem, dados = '') {
  const timestamp = new Date().toISOString();
  const dadosStr = dados ? ` | ${typeof dados === 'object' ? JSON.stringify(dados) : dados}` : '';
  return `[${timestamp}] [${nivel}] ${mensagem}${dadosStr}`;
}

function salvarLog(log) {
  try {
    fs.appendFileSync(LOG_FILE, log + '\n');
  } catch (e) {
    // Silenciar erro de log
  }
}

function error(mensagem, dados) {
  if (NIVEL_ATUAL < NIVEIS.ERROR) return;
  const log = formatarLog('ERROR', mensagem, dados);
  console.error(log);
  salvarLog(log);
}

function warn(mensagem, dados) {
  if (NIVEL_ATUAL < NIVEIS.WARN) return;
  const log = formatarLog('WARN', mensagem, dados);
  console.warn(log);
  salvarLog(log);
}

function info(mensagem, dados) {
  if (NIVEL_ATUAL < NIVEIS.INFO) return;
  const log = formatarLog('INFO', mensagem, dados);
  console.log(log);
  salvarLog(log);
}

function debug(mensagem, dados) {
  if (NIVEL_ATUAL < NIVEIS.DEBUG) return;
  const log = formatarLog('DEBUG', mensagem, dados);
  console.log(log);
  salvarLog(log);
}

module.exports = { error, warn, info, debug, NIVEIS };
