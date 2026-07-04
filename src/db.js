const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'posted.json');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
}

function hasBeenPosted(videoId) {
  return videoId in load();
}

function markAsPosted(videoId) {
  const data = load();
  data[videoId] = Date.now();
  save(data);
}

function cleanup() {
  const data = load();
  const cutoff = Date.now() - TTL_MS;
  let removed = 0;
  for (const [id, ts] of Object.entries(data)) {
    if (ts < cutoff) { delete data[id]; removed++; }
  }
  if (removed > 0) {
    save(data);
    console.log(`Cleaned up ${removed} old entries from posted.json`);
  }
}

module.exports = { hasBeenPosted, markAsPosted, cleanup };
