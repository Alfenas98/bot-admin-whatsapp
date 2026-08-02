const { db, getGroupConfig, setGroupConfig } = require('../lib/database');

// Campos que fazem sentido copiar de um grupo pro outro (evita copiar coisas
// específicas de estado, tipo jogo em andamento ou figurinhas configuradas)
const CAMPOS_SINCRONIZAVEIS = [
  'antilink', 'antilinkhard', 'antifake', 'ddiPermitidos',
  'antipalavrao', 'palavroes', 'antienquete', 'anticontato', 'x9', 'anticlone',
  'antimidia', 'antifloodFigurinha', 'antispamRepetido', 'antimarcacaomassa',
  'limiteCaracteres', 'soAdmin', 'boasvindas', 'saida', 'levelSystem',
  'autosticker', 'autoresposta', 'prefixos', 'apenasAdminUsaComandos',
  'inatividade', 'warnSystem', 'whitelistLinks', 'alertaMudancaGrupo'
];

module.exports = {
  name: 'sync',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();

    if (acao === 'definirmodelo') {
      db.set('grupoModeloId', groupId).write();
      return reply('✅ Esse grupo agora é o "modelo". Use #sync aplicar em outros grupos pra copiar essa configuração.');
    }

    if (acao === 'aplicar') {
      const modeloId = db.get('grupoModeloId').value();
      if (!modeloId) return reply('Nenhum grupo modelo foi definido ainda. Use #sync definirmodelo no grupo que quer usar como referência.');
      if (modeloId === groupId) return reply('Esse grupo já É o modelo — não precisa aplicar nele mesmo.');

      const configModelo = getGroupConfig(modeloId);
      for (const campo of CAMPOS_SINCRONIZAVEIS) {
        setGroupConfig(groupId, campo, configModelo[campo]);
      }

      return reply(`✅ Configuração copiada do grupo modelo (${CAMPOS_SINCRONIZAVEIS.length} campos aplicados).`);
    }

    const modeloId = db.get('grupoModeloId').value();
    return reply(
      `Uso: #sync definirmodelo (marca este grupo como referência)\n` +
      `#sync aplicar (copia a config do modelo pra este grupo)\n\n` +
      `Modelo atual: ${modeloId ? (modeloId === groupId ? 'este grupo' : modeloId) : 'nenhum definido'}`
    );
  }
};
