const path = require('path');

// Se STORAGE_DIR estiver definida (ex: aponta pro volume persistente do
// Railway), tudo que precisa sobreviver a um redeploy é salvo lá dentro.
// Caso contrário, usa a pasta do próprio projeto (bom pra rodar localmente).
const storageDir = process.env.STORAGE_DIR || path.join(__dirname, '..');

module.exports = { storageDir };
