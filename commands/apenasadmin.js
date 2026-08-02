const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'apenasadmin',
  aliases: ['soadmininteragir'],
  adminOnly: true, // só um admin pode ligar/desligar essa trava
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.apenasAdminUsaComandos;
    else return reply('Uso: #apenasadmin  (ou on / off)');

    setGroupConfig(groupId, 'apenasAdminUsaComandos', ativo);
    return reply(
      ativo
        ? '🔒 A partir de agora, SÓ admins do grupo podem usar comandos do bot.'
        : '🔓 Comandos abertos novamente pra todo mundo (respeitando o adminOnly de cada um individualmente).'
    );
  }
};
