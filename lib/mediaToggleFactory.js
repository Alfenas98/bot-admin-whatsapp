const { getGroupConfig, setGroupConfig } = require('./database');

/**
 * Cria um comando simples de toggle on/off pra um tipo de mídia,
 * sem precisar passar argumento (mesmo padrão do #antilink).
 * Ex: criarComandoAntiMidia('imagem', 'antiimagem') -> comando #antiimagem
 */
function criarComandoAntiMidia(tipo, nomeComando, emoji) {
  return {
    name: nomeComando,
    adminOnly: true,
    async execute({ groupId, args, reply }) {
      const opcao = (args[0] || '').toLowerCase();
      const config = getGroupConfig(groupId);

      let ativo;
      if (opcao === 'on') ativo = true;
      else if (opcao === 'off') ativo = false;
      else if (opcao === '') ativo = !config.antimidia[tipo];
      else return reply(`Uso: #${nomeComando}  (ou on / off)`);

      setGroupConfig(groupId, `antimidia.${tipo}`, ativo);
      return reply(`${emoji} Anti-${tipo} ${ativo ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
    }
  };
}

module.exports = { criarComandoAntiMidia };
