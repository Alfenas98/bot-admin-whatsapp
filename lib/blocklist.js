const { db } = require('./database');

/**
 * Verifica se um usuário está na lista negra de um grupo.
 * @param {string} groupId - ID do grupo
 * @param {string} userId - ID do usuário (formato: numero@s.whatsapp.net)
 * @returns {boolean}
 */
function estaBanido(groupId, userId) {
  const blocklist = db.get(['groups', groupId, 'blocklist']).value() || [];
  return blocklist.includes(userId);
}

/**
 * Adiciona um usuário à lista negra.
 * @param {string} groupId - ID do grupo
 * @param {string} userId - ID do usuário (formato: numero@s.whatsapp.net)
 */
function adicionarBanimento(groupId, userId) {
  const blocklist = db.get(['groups', groupId, 'blocklist']).value() || [];
  if (!blocklist.includes(userId)) {
    db.set(['groups', groupId, 'blocklist'], [...blocklist, userId]).write();
  }
}

/**
 * Remove um usuário da lista negra.
 * @param {string} groupId - ID do grupo
 * @param {string} userId - ID do usuário (formato: numero@s.whatsapp.net)
 */
function removerBanimento(groupId, userId) {
  const blocklist = db.get(['groups', groupId, 'blocklist']).value() || [];
  const nova = blocklist.filter(id => id !== userId);
  db.set(['groups', groupId, 'blocklist'], nova).write();
}

/**
 * Lista todos os banidos de um grupo.
 * @param {string} groupId - ID do grupo
 * @returns {Array}
 */
function listarBanidos(groupId) {
  return db.get(['groups', groupId, 'blocklist']).value() || [];
}

/**
 * Remove todos os banimentos de um grupo.
 * @param {string} groupId - ID do grupo
 */
function limparBanimentos(groupId) {
  db.set(['groups', groupId, 'blocklist'], []).write();
}

module.exports = {
  estaBanido,
  adicionarBanimento,
  removerBanimento,
  listarBanidos,
  limparBanimentos
};
