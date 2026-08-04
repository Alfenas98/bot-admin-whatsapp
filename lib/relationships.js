const { db } = require('./database');

function getRelacionamento(groupId, userId) {
  return db.get(['users', groupId, userId, 'relacionamento']).value() || null;
}

/**
 * Define o relacionamento pros dois lados (simétrico) — consultar tanto o
 * perfil de A quanto o de B retorna o mesmo casal.
 */
function definirRelacionamento(groupId, userIdA, userIdB) {
  const agora = Date.now();
  const pathA = ['users', groupId, userIdA];
  const pathB = ['users', groupId, userIdB];
  const existingA = db.get(pathA).value() || {};
  const existingB = db.get(pathB).value() || {};

  db.set(pathA, { ...existingA, relacionamento: { parceiroId: userIdB, desde: agora } }).write();
  db.set(pathB, { ...existingB, relacionamento: { parceiroId: userIdA, desde: agora } }).write();
}

/**
 * Termina o relacionamento de um usuário (e do parceiro dele também, já
 * que é simétrico). Retorna o ID do parceiro, ou null se não tinha ninguém.
 */
function terminarRelacionamento(groupId, userId) {
  const rel = getRelacionamento(groupId, userId);
  if (!rel) return null;

  const parceiroId = rel.parceiroId;

  const pathUsuario = ['users', groupId, userId];
  const pathParceiro = ['users', groupId, parceiroId];
  const existingUsuario = db.get(pathUsuario).value() || {};
  const existingParceiro = db.get(pathParceiro).value() || {};

  delete existingUsuario.relacionamento;
  delete existingParceiro.relacionamento;

  db.set(pathUsuario, existingUsuario).write();
  db.set(pathParceiro, existingParceiro).write();

  return parceiroId;
}

/**
 * Formata a duração desde um timestamp em "X dia(s), Y hora(s), Z minuto(s)
 * e W segundo(s)", calculado em tempo real toda vez que é chamado.
 */
function formatarDuracao(desde) {
  let segundosTotais = Math.floor((Date.now() - desde) / 1000);
  if (segundosTotais < 0) segundosTotais = 0;

  const dias = Math.floor(segundosTotais / 86400);
  segundosTotais %= 86400;
  const horas = Math.floor(segundosTotais / 3600);
  segundosTotais %= 3600;
  const minutos = Math.floor(segundosTotais / 60);
  const segundos = segundosTotais % 60;

  const partes = [];
  if (dias > 0) partes.push(`${dias} dia${dias !== 1 ? 's' : ''}`);
  partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
  partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
  partes.push(`${segundos} segundo${segundos !== 1 ? 's' : ''}`);

  return partes.join(', ');
}

/**
 * Define o casamento — só faz sentido chamar em quem já está namorando.
 * Mantém "desde" (início do namoro) e adiciona "casadoDesde" separado.
 */
function definirCasamento(groupId, userIdA, userIdB) {
  const agora = Date.now();
  const pathA = ['users', groupId, userIdA];
  const pathB = ['users', groupId, userIdB];
  const existingA = db.get(pathA).value() || {};
  const existingB = db.get(pathB).value() || {};

  const relA = existingA.relacionamento || {};
  const relB = existingB.relacionamento || {};

  db.set(pathA, { ...existingA, relacionamento: { ...relA, parceiroId: userIdB, casado: true, casadoDesde: agora } }).write();
  db.set(pathB, { ...existingB, relacionamento: { ...relB, parceiroId: userIdA, casado: true, casadoDesde: agora } }).write();
}

module.exports = { getRelacionamento, definirRelacionamento, definirCasamento, terminarRelacionamento, formatarDuracao };
