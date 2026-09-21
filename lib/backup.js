/**
 * Sistema de Backup Automático
 * 
 * Faz backup do banco de dados a cada 6 horas.
 * Mantém os últimos 7 backups.
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'database', 'db.json');
const MAX_BACKUPS = 7;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function fazerBackup() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('[backup] Banco de dados não encontrado.');
      return;
    }
    
    const agora = new Date();
    const nomeBackup = `backup-${agora.toISOString().replace(/[:.]/g, '-')}.json`;
    const caminhoBackup = path.join(BACKUP_DIR, nomeBackup);
    
    fs.copyFileSync(DB_PATH, caminhoBackup);
    
    console.log(`[backup] Backup criado: ${nomeBackup}`);
    
    limparBackupsAntigos();
  } catch (e) {
    console.error('[backup] Erro ao fazer backup:', e.message);
  }
}

function limparBackupsAntigos() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length > MAX_BACKUPS) {
      const paraRemover = backups.slice(MAX_BACKUPS);
      for (const arquivo of paraRemover) {
        fs.unlinkSync(path.join(BACKUP_DIR, arquivo));
        console.log(`[backup] Backup removido: ${arquivo}`);
      }
    }
  } catch (e) {
    console.error('[backup] Erro ao limpar backups:', e.message);
  }
}

function iniciarBackupAutomatico() {
  // Backup a cada 6 horas
  const intervalo = 6 * 60 * 60 * 1000;
  
  // Fazer backup imediato
  fazerBackup();
  
  // Agendar backups
  setInterval(fazerBackup, intervalo);
  
  console.log('[backup] Backup automático configurado (a cada 6h)');
}

module.exports = { fazerBackup, iniciarBackupAutomatico };
