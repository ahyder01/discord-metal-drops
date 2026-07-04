const { google } = require('googleapis');

const LABELS = [
  { name: 'Sumerian Records',    id: 'UCAtlZO9a52JIhQRyXDRLaZQ' },
  { name: 'Rise Records',        id: 'UCxnS0WDBVfBnTP2e97DYDSA' },
  { name: 'SharpTone Records',   id: 'UC4JNkNxIB9u2Yihx7lTZA5Q' },
  { name: 'Fearless Records',    id: 'UCKMYrg58k3muz90hG0OSVhA' },
  { name: 'Nuclear Blast',       id: 'UCoxg3Kml41wE3IPq-PC-LQw' },
  { name: 'Century Media',       id: 'UCnK9PxMozTYs8ELOvgMNKFA' },
  { name: 'UNFD',                id: 'UCST_KTjlK574mzXHDan7-_Q' },
  { name: 'Solid State Records', id: 'UCIAgiNh4buO61TFA2dJAVzw' },
  { name: 'Pure Noise Records',  id: 'UCC7ElkFVK3m03gEMfaq6Ung' },
  { name: 'Hopeless Records',    id: 'UCToUNe4i9j_SlKGFl8MrQHg' },
  { name: 'Unique Leader',       id: 'UC-6umqcTBkl9IH4Z8Z-O1jg' },
  { name: 'Epitaph Records',     id: 'UCDE5Ezmxq1bNVak4lmkpCMw' },
  { name: 'Artery Recordings',   id: 'UC-7XDs60YgKNyWq2S7rUtmg' },
  { name: 'Better Noise Music',  id: 'UCqh8RdUfSR9lGyasBhM_bjA' },
];

const BLOCK = new RegExp(
  [
    'react(ion)?', 'ranking', 'top\\s*\\d+', 'drama', 'beef',
    'lesson', 'tutorial', 'how[-\\s]?to', 'playthrough',
    'drum\\s+(cover|cam)', 'guitar\\s+(cover|lesson)', 'bass\\s+(cover|lesson)',
    'cover', 'fan[-\\s]?made', 'unofficial',
    'remix', 'rmx', 'rework', 'bootleg', 'mashup',
    'slowed', 'reverb', 'sped[-\\s]?up', 'nightcore', '8d\\s*audio',
    'suno', 'udio', 'ai[-\\s]?generat', 'ai[-\\s]?(cover|version|music|song)',
    'artificial\\s+intelligence',
    'live\\s+(at|from|@)', '\\blive\\s+\\d{4}', 'full\\s+concert',
    'lyric(s)?[-\\s]video', 'playlist', 'compilation',
  ].map(p => `(?:${p})`).join('|'),
  'i',
);

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

  for (const label of LABELS) {
    const res = await youtube.search.list({
      part: ['snippet'],
      channelId: label.id,
      type: ['video'],
      publishedAfter,
      order: 'date',
      maxResults: 10,
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
          label: label.name,
        });
      }
    }
  }

  if (seen.size === 0) return [];

  // Filter out Shorts / clips by duration
  const ids = [...seen.keys()];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  for (const chunk of chunks) {
    const detail = await youtube.videos.list({ part: ['contentDetails'], id: chunk });
    for (const v of detail.data.items || []) {
      if (parseDuration(v.contentDetails.duration) < MIN_SECONDS) seen.delete(v.id);
    }
  }

  return [...seen.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
}

module.exports = { fetchNewTracks, LABELS };
