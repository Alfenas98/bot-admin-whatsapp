/**
 * Script para atualizar o banco de dados
 * Adiciona o campo 'cargos' em todos os grupos existentes
 */

const { db } = require('./database');

function atualizarBanco() {
  const grupos = db.get('groups').value() || {};
  
  for (const [groupId, config] of Object.entries(grupos)) {
    if (!config.cargos) {
      db.set(['groups', groupId, 'cargos'], { ativo: false, modo: 'automático' }).write();
      console.log(`[update] Campo 'cargos' adicionado ao grupo ${groupId}`);
    }
  }
  
  console.log('[update] Banco de dados atualizado com sucesso!');
}

atualizarBanco();
