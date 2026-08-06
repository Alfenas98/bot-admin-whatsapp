const { isGroupAdmin } = require('./permissions');

const GROUP_CACHE_TTL_MS = 30 * 1000;
const groupMetadataCache = new Map();

async function getCachedGroupMetadata(sock, groupId) {
  const hit = groupMetadataCache.get(groupId);
  if (hit && Date.now() - hit.ts < GROUP_CACHE_TTL_MS) {
    return hit.metadata;
  }
  
  const metadata = await sock.groupMetadata(groupId);
  groupMetadataCache.set(groupId, { metadata, ts: Date.now() });
  return metadata;
}

async function isGroupAdminCached(sock, groupId, participantId) {
  const metadata = await getCachedGroupMetadata(sock, groupId);
  const participant = metadata.participants.find(p => p.id === participantId);
  return participant ? ['admin', 'superadmin'].includes(participant.admin) : false;
}

async function getAdminIdsCached(sock, groupId) {
  const metadata = await getCachedGroupMetadata(sock, groupId);
  return metadata.participants
    .filter(p => ['admin', 'superadmin'].includes(p.admin))
    .map(p => p.id);
}

function invalidateGroupCache(groupId) {
  groupMetadataCache.delete(groupId);
}

module.exports = {
  getCachedGroupMetadata,
  isGroupAdminCached,
  getAdminIdsCached,
  invalidateGroupCache
};
