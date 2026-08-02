const { db } = require('./database');

/**
 * Data de "hoje" no fuso configurado (mesma lógica do scheduler, pra ficar
 * consistente com os horários de disparo agendados).
 */
function hojeStr() {
  const offsetHoras = parseInt(process.env.TIMEZONE_OFFSET_HOURS || '0', 10);
  const agora = new Date();
  agora.setHours(agora.getHours() + offsetHoras);
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

/**
 * Registra +1 mensagem no contador diário do usuário. Se o último registro
 * for de um dia diferente de hoje, reseta o contador antes de somar.
 */
function registrarMensagemDiaria(groupId, userId) {
  const path = ['users', groupId, userId];
  const existing = db.get(path).value() || {};
  const hoje = hojeStr();

  const diarioAtual = existing.diario && existing.diario.data === hoje
    ? existing.diario
    : { data: hoje, mensagens: 0 };

  diarioAtual.mensagens += 1;
  db.set(path, { ...existing, diario: diarioAtual }).write();
}

/**
 * Retorna o ranking de hoje, ordenado por mensagens (maior primeiro).
 * Usuários cujo último registro não é de hoje são ignorados automaticamente
 * (o "reset" é implícito: eles só voltam a aparecer quando mandarem
 * mensagem de novo, e o contador deles recomeça do zero).
 */
function getRankDiario(groupId, limite = 10) {
  const hoje = hojeStr();
  const usuarios = db.get(['users', groupId]).value() || {};

  return Object.entries(usuarios)
    .filter(([, dados]) => dados.diario && dados.diario.data === hoje && dados.diario.mensagens > 0)
    .sort((a, b) => b[1].diario.mensagens - a[1].diario.mensagens)
    .slice(0, limite);
}

module.exports = { registrarMensagemDiaria, getRankDiario, hojeStr };
