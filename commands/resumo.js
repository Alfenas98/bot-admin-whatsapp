const axios = require('axios');
const { db, getGroupConfig } = require('../lib/database');

module.exports = {
  name: 'resumo',
  aliases: ['resumir', 'summary'],
  adminOnly: false,

  async execute({ groupId, reply }) {
    if (!process.env.GEMINI_API_KEY) {
      return reply('⚠️ IA não configurada. Defina GEMINI_API_KEY no Railway.');
    }

    try {
      // Obter mensagens recentes do banco/cache
      const config = getGroupConfig(groupId);
      const usuarios = db.get(['users', groupId]).value() || {};
      
      // Coletar dados dos usuários ativos
      const usuariosAtivos = Object.entries(usuarios)
        .filter(([, dados]) => dados.mensagens > 0)
        .sort((a, b) => (b[1].mensagens || 0) - (a[1].mensagens || 0))
        .slice(0, 10)
        .map(([id, dados]) => ({
          nome: id.split('@')[0],
          mensagens: dados.mensagens,
          nivel: dados.nivel || 1
        }));

      if (usuariosAtivos.length === 0) {
        return reply('📭 Nenhuma mensagem encontrada para resumir.');
      }

      const prompt = `Crie um resumo breve e divertido da atividade do grupo:

📊 DADOS DO GRUPO:
${usuariosAtivos.map(u => `- ${u.nome}: ${u.mensagens} mensagens (nível ${u.nivel})`).join('\n')}

Forneça:
1. Um resumo de 2-3 frases sobre a atividade
2. O membro mais ativo
3. Uma observação engraçada

Responda em Português-BR, de forma leve. Use emojis.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, { timeout: 30000 });

      const resposta = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resposta) {
        return reply('⚠️ A IA não conseguiu resumir. Tente novamente.');
      }

      return reply(`📋 *Resumo do Grupo*\n\n${resposta}`);
    } catch (err) {
      console.error('[resumo] Erro:', err.message);
      return reply('⚠️ Erro ao resumir. Tente novamente mais tarde.');
    }
  }
};
