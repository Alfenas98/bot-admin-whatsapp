const { db, getGroupConfig, setGroupConfig } = require('../lib/database');

module.exports = {
  name: 'broadcast',
  adminOnly: true,
  async execute({ sock, groupId, args, reply }) {
    const acao = (args[0] || '').toLowerCase();
    const config = getGroupConfig(groupId);

    if (acao === 'origem') {
      const opcao = (args[1] || '').toLowerCase();
      if (opcao !== 'on' && opcao !== 'off') return reply('Uso: #broadcast origem on|off');
      setGroupConfig(groupId, 'broadcast.podeEnviar', opcao === 'on');
      return reply(`✅ Esse grupo ${opcao === 'on' ? 'PODE' : 'NÃO PODE mais'} enviar broadcast pra outros grupos.`);
    }

    if (acao === 'receber') {
      const opcao = (args[1] || '').toLowerCase();
      if (opcao !== 'on' && opcao !== 'off') return reply('Uso: #broadcast receber on|off');
      setGroupConfig(groupId, 'broadcast.receber', opcao === 'on');
      return reply(`✅ Esse grupo ${opcao === 'on' ? 'VAI' : 'NÃO VAI mais'} receber broadcast de outros grupos.`);
    }

    // #broadcast <mensagem>
    if (!config.broadcast.podeEnviar) {
      return reply('❌ Esse grupo não está autorizado a enviar broadcast. Ative com #broadcast origem on.');
    }

    const texto = args.join(' ');
    if (!texto) return reply('Uso: #broadcast <mensagem>\n#broadcast origem on|off\n#broadcast receber on|off');

    const grupos = db.get('groups').value() || {};
    const destinos = Object.keys(grupos).filter(id => id !== groupId && grupos[id].broadcast?.receber);

    if (destinos.length === 0) {
      return reply('Nenhum outro grupo está configurado pra receber broadcast (#broadcast receber on).');
    }

    let enviados = 0;
    for (const destino of destinos) {
      try {
        await sock.sendMessage(destino, { text: `📢 *Aviso*\n\n${texto}` });
        enviados++;
      } catch (err) {
        console.error(`[broadcast] Falha ao enviar pro grupo ${destino}:`, err.message);
      }
    }

    return reply(`✅ Mensagem enviada pra ${enviados}/${destinos.length} grupo(s).`);
  }
};
