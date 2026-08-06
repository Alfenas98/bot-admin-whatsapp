const metrics = {
  connectionEvents: 0,
  messagesSent: 0,
  messageSendErrors: 0,
  commandsExecuted: 0,
  adminLostAlerts: 0
};

function inc(key) {
  metrics[key] = (metrics[key] || 0) + 1;
}

function get() {
  return { ...metrics };
}

module.exports = { inc, get };
