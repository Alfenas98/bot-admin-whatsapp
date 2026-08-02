const { getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'zoeiranovato',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const opcao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (opcao === 'frase') {
      const sub = (args[1] || '').toLowerCase();

      if (sub === 'add') {
        const texto = args.slice(2).join(' ');
        if (!texto) return reply('Uso: #zoeiranovato frase add <texto>\nUse @user onde quiser mencionar a pessoa.');
        const lista = [...(config.zoeiraNovato.frasesCustom || []), texto];
        setGroupConfig(groupId, 'zoeiraNovato.frasesCustom', lista);
        return reply(`✅ Frase adicionada (${lista.length} personalizada(s)). A partir de agora só essas são usadas, não as padrão.`);
      }

      if (sub === 'listar') {
        const lista = config.zoeiraNovato.frasesCustom || [];
        if (lista.length === 0) return reply('Nenhuma frase personalizada — usando as frases padrão.');
        return reply(lista.map((f, i) => `${i + 1}. ${f}`).join('\n'));
      }

      if (sub === 'remover') {
        const indice = parseInt(args[2], 10);
        const lista = config.zoeiraNovato.frasesCustom || [];
        if (!indice || indice < 1 || indice > lista.length) return reply('Uso: #zoeiranovato frase remover <número> (veja com "frase listar")');
        const nova = lista.filter((_, i) => i !== indice - 1);
        setGroupConfig(groupId, 'zoeiraNovato.frasesCustom', nova);
        return reply(`✅ Frase removida (${nova.length} restante(s)).`);
      }

      if (sub === 'limpar') {
        setGroupConfig(groupId, 'zoeiraNovato.frasesCustom', []);
        return reply('✅ Frases personalizadas apagadas. Voltou a usar as frases padrão.');
      }

      return reply('Uso: #zoeiranovato frase add <texto> | listar | remover <número> | limpar\nUse @user no texto pra mencionar quem foi zoado.');
    }

    let ativo;
    if (opcao === 'on') ativo = true;
    else if (opcao === 'off') ativo = false;
    else if (opcao === '') ativo = !config.zoeiraNovato.ativo;
    else {
      return reply(
        'Uso: #zoeiranovato  (ou on / off)\n' +
        '#zoeiranovato frase add|listar|remover|limpar\n\n' +
        '⚠️ A detecção é por nome de exibição no WhatsApp, comparado com uma ' +
        'lista de nomes comuns no Brasil — não é 100% precisa.'
      );
    }
    setGroupConfig(groupId, 'zoeiraNovato.ativo', ativo);
    return reply(`😂 Zoeira de novato ${ativo ? 'ATIVADA ✅' : 'DESATIVADA ❌'}`);
  }
};
