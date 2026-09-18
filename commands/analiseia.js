const { analisarGrupo } = require('../lib/ai');

module.exports = {
  name: 'analiseia',
  aliases: ['analisebot', 'insights'],
  adminOnly: true,

  async execute({ sock, groupId, msg, reply }) {
    try {
      await reply('🔍 Analisando o grupo com IA...');
      
      // Obter participantes do grupo
      const metadata = await sock.groupMetadata(groupId);
      const participantes = metadata.participants?.map(p => p.pushName || 'Desconhecido') || [];
      
      // Criar contexto com informações disponíveis
      const infoGrupo = `Grupo: ${metadata.subject || 'Sem nome'}
Participantes: ${participantes.length}
Criado em: ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString('pt-BR') : 'Desconhecido'}
Descrição: ${metadata.desc || 'Sem descrição'}

Lista dos primeiros 20 participantes:
${participantes.slice(0, 20).join('\n')}`;
      
      const analise = await analisarGrupo([], participantes);
      
      if (analise) {
        await sock.sendMessage(groupId, { 
          text: `📊 *Análise do Grupo*\n\n${infoGrupo}\n\n${analise}` 
        }, { quoted: msg });
      } else {
        await reply('⚠️ A IA não conseguiu analisar. Tente novamente.');
      }
    } catch (err) {
      console.error('[analiseia] Erro:', err.message);
      await reply('⚠️ Erro ao analisar grupo.');
    }
  }
};
