const { getUltimaAtividade, registrarEntrada } = require('./activity');

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Analisa os participantes de um grupo e retorna quem está inativo há mais
 * de `diasLimite` dias. NÃO remove ninguém automaticamente aqui — só
 * calcula. Ignora admins e o próprio bot.
 *
 * Participantes sem nenhum histórico de atividade registrado são ignorados
 * nesta checagem (retornam como "sem dados"), pra evitar remoção em massa
 * assim que a função é ligada pela primeira vez. Eles passam a ser
 * rastreados a partir de agora.
 */
function calcularInativos(groupId, participantes, botId, diasLimite) {
  const agora = Date.now();
  const limiteMs = diasLimite * UM_DIA_MS;

  const inativos = [];
  const semDados = [];

  for (const p of participantes) {
    if (p.id === botId) continue;
    if (['admin', 'superadmin'].includes(p.admin)) continue;

    const ultimaAtividade = getUltimaAtividade(groupId, p.id);

    if (ultimaAtividade === null) {
      // Nunca vimos esse usuário antes: começa a rastrear a partir de agora,
      // não remove nesta rodada.
      registrarEntrada(groupId, p.id);
      semDados.push(p.id);
      continue;
    }

    if (agora - ultimaAtividade > limiteMs) {
      inativos.push(p.id);
    }
  }

  return { inativos, semDados };
}

module.exports = { calcularInativos };
