const eununca = require('./games/eununca');
const eununca18 = require('./games/eununca18');
const verdadeoudesafio = require('./games/verdadeoudesafio');
const qualfoi = require('./games/qualfoi');
const enquetepolemica = require('./games/enquetepolemica');

// Adicione novos jogos aqui — a ordem define a numeração mostrada em #jogos
const listaJogos = [eununca, eununca18, verdadeoudesafio, qualfoi, enquetepolemica];

function getJogoPorId(id) {
  return listaJogos.find(j => j.id === id);
}

module.exports = { listaJogos, getJogoPorId };
