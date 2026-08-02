const fs = require('fs');
const path = require('path');

/**
 * Lê todos os arquivos .js da pasta commands/ e monta um Map de comando -> handler.
 * Cada arquivo de comando deve exportar: { name, aliases, adminOnly, execute(ctx) }
 */
function loadCommands() {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  const commands = new Map();

  for (const file of files) {
    const command = require(path.join(commandsPath, file));

    if (!command.name || typeof command.execute !== 'function') {
      console.warn(`[commandLoader] Arquivo ${file} ignorado: falta "name" ou "execute"`);
      continue;
    }

    commands.set(command.name, command);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        commands.set(alias, command);
      }
    }
  }

  console.log(`[commandLoader] ${files.length} arquivo(s) carregado(s), ${commands.size} comando(s)/alias registrados.`);
  return commands;
}

module.exports = { loadCommands };
