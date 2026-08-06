const { DEFAULT_GROUP_CONFIG } = require('./database');

const REQUIRED_GROUP_FIELDS = Object.keys(DEFAULT_GROUP_CONFIG);

function validateGroupConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, missing: REQUIRED_GROUP_FIELDS };
  }

  const missing = [];
  for (const field of REQUIRED_GROUP_FIELDS) {
    if (!(field in config)) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

module.exports = { validateGroupConfig, REQUIRED_GROUP_FIELDS };
