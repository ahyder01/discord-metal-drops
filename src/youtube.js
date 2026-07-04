const { google } = require('googleapis');

const GENRES = [
  { term: 'metalcore band',          label: 'Metalcore' },
  { term: 'deathcore band',          label: 'Deathcore' },
  { term: 'hardcore punk band',      label: 'Hardcore' },
  { term: 'post-hardcore band',      label: 'Post-Hardcore' },
  { term: 'melodic metalcore band',  label: 'Melodic Metalcore' },
  { term: 'beatdown hardcore band',  label: 'Beatdown Hardcore' },
  { term: 'mathcore band',           label: 'Mathcore' },
];

// Block titles that match any of these
const BLOCK = new RegExp(
  [
    // Reactions / commentary
    'react(ion)?', 'ranking', 'top\\s*\\d+', 'drama', 'beef',
    // Educational / non-release
    'lesson', 'tutorial', 'how[-\\s]?to', 'tab(s)?', 'playthrough',
    'drum\\s+(cover|cam)', 'guitar\\s+(cover|lesson)', 'bass\\s+(cover|lesson)',
    // Covers & fan content
    'cover', 'fan[-\\s]?made', 'unofficial',
    // Remixes / edits
    'remix', 'rmx', 'rework', 'bootleg', 'mashup', 'flip\\s+by',
    // Audio manipulation
    'slowed', 'reverb', 'sped[-\\s]?up', 'speed[-\\s]?up',
    'nightcore', '8d\\s*audio', 'bass[-\\s]?boost',
    // AI music generators
    'suno', 'udio', 'ai[-\\s]?generat', 'ai[-\\s]?(cover|version|music|song|band)',
    'a\\.i\\.[-\\s]?(cover|version|music|song|band)',
    'artificial\\s+intelligence',
    // Live recordings
    'live\\s+(at|from|@)', '\\blive\\s+\\d{4}', 'full\\s+concert', 'concert\\s+film',
    // Misc low quality
    'lyric(s)?[-\\s]video', 'playlist', 'mixtape', 'compilation',
    'acoustic\\s+version', 'unplugged',
    // Wrong genre / hip-hop crossover
    'hip[-\\s]?hop', 'type\\s+beat', '\\brap\\b', '\\bdrill\\b', '\\btrap\\b',
    'freestyle', 'diss\\s+track',
  ].map(p => `(?:${p})`).join('|'),
  'i',
);

// Minimum track length in seconds — filters out Shorts and clips
const MIN_SECONDS = 90;

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

async function fetchNewTracks(apiKey, hoursBack = 26) {
  const youtube = google.youtube({ version: 'v3', auth: apiKey });
  const publishedAfter = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const seen = new Map();

  for (const genre of GENRES) {
    const res = await youtube.search.list({
      part: ['snippet'],
      // Exclusions in the query help before we even filter locally
      q: `"${genre.term}" (official audio OR official video OR new single OR new song) -remix -cover -rap -"hip hop" -"type beat"`,
      type: ['video'],
      videoCategoryId: '10', // Music
      videoDuration: 'medium', // 4–20 min — excludes Shorts automatically
      publishedAfter,
      order: 'date',
      maxResults: 25,
    });

    for (const item of res.data.items || []) {
      const id = item.id.videoId;
      const title = item.snippet.title;
      if (!seen.has(id) && !BLOCK.test(title)) {
        seen.set(id, {
          id,
          title,
          channel: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnail:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${id}`,
          genre: genre.label,
        });
      }
    }
  }

  if (seen.size === 0) return [];

  // Batch-fetch durations to drop anything under MIN_SECONDS (catches anything
  // videoDuration:'medium' missed, e.g. 2-minute interludes)
  const ids = [...seen.keys()];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  for (const chunk of chunks) {
    const detail = await youtube.videos.list({
      part: ['contentDetails'],
      id: chunk,
    });
    for (const v of detail.data.items || []) {
      const secs = parseDuration(v.contentDetails.duration);
      if (secs < MIN_SECONDS) seen.delete(v.id);
    }
  }

  return [...seen.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
}

module.exports = { fetchNewTracks };
