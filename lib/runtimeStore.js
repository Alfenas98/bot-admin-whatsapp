const { db } = require('./database');

const RUNTIME_KEY = '__runtime__';

function getRuntime() {
  const existing = db.get(['runtime', RUNTIME_KEY]).value();
  return existing || { games: {}, jobs: {}, metrics: { sends: 0, sendErrors: 0, adminChecks: 0, adminCacheHits: 0 } };
}

function saveRuntime(runtime) {
  db.set(['runtime', RUNTIME_KEY], runtime).write();
}

function getGameState(groupId) {
  return getRuntime().games[groupId] || null;
}

function setGameState(groupId, state) {
  const runtime = getRuntime();
  runtime.games[groupId] = state;
  saveRuntime(runtime);
}

function removeGameState(groupId) {
  const runtime = getRuntime();
  delete runtime.games[groupId];
  saveRuntime(runtime);
}

function getSchedulerJobState(groupId) {
  return getRuntime().jobs[groupId] || null;
}

function setSchedulerJobState(groupId, state) {
  const runtime = getRuntime();
  runtime.jobs[groupId] = state;
  saveRuntime(runtime);
}

function removeSchedulerJobState(groupId) {
  const runtime = getRuntime();
  delete runtime.jobs[groupId];
  saveRuntime(runtime);
}

function incMetric(key) {
  const runtime = getRuntime();
  runtime.metrics[key] = (runtime.metrics[key] || 0) + 1;
  saveRuntime(runtime);
}

function getMetrics() {
  return getRuntime().metrics || { sends: 0, sendErrors: 0, adminChecks: 0, adminCacheHits: 0 };
}

module.exports = {
  getGameState,
  setGameState,
  removeGameState,
  getSchedulerJobState,
  setSchedulerJobState,
  removeSchedulerJobState,
  incMetric,
  getMetrics
};
