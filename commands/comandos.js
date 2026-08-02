const { loadCommands } = require('../lib/commandLoader');

module.exports = {
  name: 'comandos',
  aliases: ['listacomandos', 'todoscomandos'],
  adminOnly: false,
  async execute({ reply }) {
    const commands = loadCommands();

    // Deduplica (o Map tem uma entrada por alias, apontando pro mesmo comando)
    const unicos = new Map();
    for (const cmd of commands.values()) {
      if (!unicos.has(cmd.name)) unicos.set(cmd.name, cmd);
    }

    const lista = [...unicos.values()].sort((a, b) => a.name.localeCompare(b.name));

    const texto = lista
      .map(cmd => {
        const aliasesTexto = cmd.aliases && cmd.aliases.length > 0
          ? ` _(ou: ${cmd.aliases.map(a => '#' + a).join(', ')})_`
          : '';
        const marcaAdmin = cmd.adminOnly ? ' 🔒' : '';
        return `#${cmd.name}${marcaAdmin}${aliasesTexto}`;
      })
      .join('\n');

    return reply(
      `📜 *Todos os comandos (${lista.length})*\n` +
      `🔒 = só admin do grupo pode usar\n\n${texto}\n\n` +
      `Use #menu pra ver organizado por categoria, com a sintaxe de cada um.`
    );
  }
};
