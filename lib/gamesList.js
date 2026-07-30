const eununca = require('./games/eununca');

// Adicione novos jogos aqui — a ordem define a numeração mostrada em #jogos
const listaJogos = [eununca];

function getJogoPorId(id) {
  return listaJogos.find(j => j.id === id);
}

module.exports = { listaJogos, getJogoPorId };
