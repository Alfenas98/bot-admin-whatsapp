const { withRetry } = require('./retry');
const { inc } = require('./metrics');

function createResilientSocket(sock) {
  const wrapped = {
    sendMessage: (jid, message, options) =>
      withRetry(() => sock.sendMessage(jid, message, options).then(() => inc('messagesSent')).catch((err) => { inc('messageSendErrors'); throw err; }), 'sendMessage'),

    groupParticipantsUpdate: (jid, participants, action) =>
      withRetry(() => sock.groupParticipantsUpdate(jid, participants, action), 'groupParticipantsUpdate'),

    groupSettingUpdate: (jid, setting) =>
      withRetry(() => sock.groupSettingUpdate(jid, setting), 'groupSettingUpdate'),
  };

  // Proxy qualquer outra chamada do socket para o original
  return new Proxy(wrapped, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return sock[prop];
    }
  });
}

module.exports = { createResilientSocket };
