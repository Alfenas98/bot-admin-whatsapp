const eununca = require("./games/eununca");
const eununca18 = require("./games/eununca18");

// Adicione novos jogos aqui — a ordem define a numeração mostrada em #jogos
const listaJogos = [eununca, eununca18];

function getJogoPorId(id) {
  return listaJogos.find((j) => j.id === id);
}

module.exports = { listaJogos, getJogoPorId };