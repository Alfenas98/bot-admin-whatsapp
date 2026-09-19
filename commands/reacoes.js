const { db } = require('../lib/database');
const { REACOES_PADRAO } = require('../lib/reactions');

module.exports = {
  name: 'reacoes',
  aliases: ['react', 'reaction'],
  adminOnly: true,

  async execute({ sock, groupId, msg, reply, args }) {
    const config = db.get(['groups', groupId]).value() || {};
    const reacoes = config.reacoesAutomaticas || { ativo: false };
    
    const subcomando = (args[0] || 'help').toLowerCase();
    
    if (subcomando === 'on' || subcomando === 'ativar') {
      db.set(['groups', groupId, 'reacoesAutomaticas', 'ativo'], true).write();
      return reply('✅ Reações automáticas ATIVADAS!\n\nO bot vai reagir a mensagens com emojis baseados em palavras-chave.\n\nUse #reacoes add <palavra> <emoji> para adicionar novas reações.');
    }
    
    if (subcomando === 'off' || subcomando === 'desativar') {
      db.set(['groups', groupId, 'reacoesAutomaticas', 'ativo'], false).write();
      return reply('❌ Reações automáticas DESATIVADAS!');
    }
    
    if (subcomando === 'add' || subcomando === 'adicionar') {
      const palavra = args[1];
      const emoji = args[2];
      
      if (!palavra || !emoji) {
        return reply('Uso: #reacoes add <palavra> <emoji>\nEx: #reacoes add bahia 🔵⚪🔴');
      }
      
      // Adicionar reação customizada
      const custom = reacoes.custom || {};
      custom[palavra.toLowerCase()] = emoji;
      db.set(['groups', groupId, 'reacoesAutomaticas', 'custom'], custom).write();
      
      return reply(`✅ Reação adicionada: "${palavra}" → ${emoji}`);
    }
    
    if (subcomando === 'remove' || subcomando === 'remover') {
      const palavra = args[1];
      
      if (!palavra) {
        return reply('Uso: #reacoes remove <palavra>');
      }
      
      const custom = reacoes.custom || {};
      delete custom[palavra.toLowerCase()];
      db.set(['groups', groupId, 'reacoesAutomaticas', 'custom'], custom).write();
      
      return reply(`✅ Reação removida: "${palavra}"`);
    }
    
    if (subcomando === 'list' || subcomando === 'listar') {
      const custom = reacoes.custom || {};
      const lista = Object.entries(custom)
        .map(([p, e]) => `• ${p} → ${e}`)
        .join('\n');
      
      return reply(
        `📋 *Reações Automáticas*\n\n` +
        `Status: ${reacoes.ativo ? '✅ Ativo' : '❌ Inativo'}\n\n` +
        `Reações padrão: ${Object.keys(REACOES_PADRAO).length} palavras\n` +
        `Reações customizadas: ${Object.keys(custom).length} palavras\n\n` +
        (lista ? `Customizadas:\n${lista}` : '_Sem reações customizadas_')
      );
    }
    
    if (subcomando === 'test' || subcomando === 'testar') {
      const texto = args.slice(1).join(' ');
      if (!texto) {
        return reply('Uso: #reacoes test <mensagem>');
      }
      
      const { encontrarReacoes } = require('../lib/reactions');
      const emojis = encontrarReacoes(texto, { ...REACOES_PADRAO, ...(reacoes.custom || {}) });
      
      if (emojis.length === 0) {
        return reply('❌ Nenhuma reação encontrada para essa mensagem.');
      }
      
      return reply(`Emojis que seriam usados: ${emojis.join(' ')}`);
    }
    
    // Ajuda
    return reply(
      `🤖 *Reações Automáticas*\n\n` +
      `O bot reage a mensagens com emojis baseados em palavras-chave.\n\n` +
      `Comandos:\n` +
      `• #reacoes on - Ativar\n` +
      `• #reacoes off - Desativar\n` +
      `• #reacoes add <palavra> <emoji> - Adicionar reação\n` +
      `• #reacoes remove <palavra> - Remover reação\n` +
      `• #reacoes list - Listar reações\n` +
      `• #reacoes test <mensagem> - Testar reações\n\n` +
      `Exemplos de reações padrão:\n` +
      `• "Brasil foi campeão" → 🇧🇷\n` +
      `• "que dia lindo" → ☀️\n` +
      `• "tô feliz" → 😊\n` +
      `• "almocei pizza" → 🍕`
    );
  }
};
