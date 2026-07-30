const { getGroupConfig, setGroupConfig } = require('../lib/database');
module.exports = {
  name: 'ddi',
  adminOnly: true,
  async execute({ groupId, args, reply }) {
    const codigo = (args[0] || '').replace(/\D/g, '');
    if (!codigo) return reply('Uso: #ddi <código>  (ex: #ddi 55 pra permitir Brasil)');
    const config = getGroupConfig(groupId);
    const lista = new Set(config.ddiPermitidos);
    if (lista.has(codigo)) {
      lista.delete(codigo);
      setGroupConfig(groupId, 'ddiPermitidos', [...lista]);
      return reply(`➖ DDI ${codigo} removido da lista permitida.`);
    }
    lista.add(codigo);
    setGroupConfig(groupId, 'ddiPermitidos', [...lista]);
    return reply(`➕ DDI ${codigo} adicionado à lista permitida.`);
  }
};
