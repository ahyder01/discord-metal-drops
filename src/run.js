require('dotenv').config();
const { WebhookClient, EmbedBuilder } = require('discord.js');
const { fetchNewTracks } = require('./youtube');
const { hasBeenPosted, markAsPosted, cleanup } = require('./db');

const LABEL_COLORS = {
  'Sumerian Records':    0xe74c3c,
  'Rise Records':        0x3498db,
  'SharpTone Records':   0x2ecc71,
  'Fearless Records':    0xf39c12,
  'Nuclear Blast':       0x8b0000,
  'Century Media':       0x9b59b6,
  'UNFD':                0x1abc9c,
  'Solid State Records': 0xe67e22,
  'Pure Noise Records':  0x16a085,
  'Hopeless Records':    0xd35400,
  'Unique Leader':       0x2c3e50,
  'Epitaph Records':     0x7f8c8d,
  'Artery Recordings':   0xc0392b,
  'Better Noise Music':  0x8e44ad,
};

const MAX_PER_RUN = 30;

async function main() {
  const { YOUTUBE_API_KEY, DISCORD_WEBHOOK_URL } = process.env;

  if (!YOUTUBE_API_KEY || !DISCORD_WEBHOOK_URL) {
    console.error('Missing YOUTUBE_API_KEY or DISCORD_WEBHOOK_URL');
    process.exit(1);
  }

  const webhook = new WebhookClient({ url: DISCORD_WEBHOOK_URL });

  console.log('Fetching new tracks...');
  const tracks = await fetchNewTracks(YOUTUBE_API_KEY);
  console.log(`Found ${tracks.length} candidates.`);

  const fresh = tracks.filter(t => !hasBeenPosted(t.id)).slice(0, MAX_PER_RUN);

  if (fresh.length === 0) {
    console.log('No new tracks to post.');
    webhook.destroy();
    return;
  }

  const HEADERS = [
    `your weekly reminder that silence is for the weak`,
    `the labels have been busy. your ears have been warned`,
    `fresh from the pits of the internet`,
    `another week, another reason to scare your neighbours`,
    `your algorithm doesn't know about these. we do`,
    `this week's damage report`,
    `drop everything. no seriously, drop it`,
    `for those who skipped the pop charts`,
  ];

  const title = HEADERS[Math.floor(Math.random() * HEADERS.length)];

  await webhook.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🤘 ${fresh.length} new track${fresh.length !== 1 ? 's' : ''} this week`)
        .setDescription(`*${title}*`)
        .setColor(0x1a1a1a)
        .setTimestamp(),
    ],
  });

  for (const track of fresh) {
    const tsSeconds = Math.floor(new Date(track.publishedAt).getTime() / 1000);

    await webhook.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(track.title)
          .setURL(track.url)
          .setAuthor({ name: track.channel })
          .setThumbnail(track.thumbnail)
          .addFields(
            { name: 'Label',    value: track.label,          inline: true },
            { name: 'Released', value: `<t:${tsSeconds}:R>`, inline: true },
          )
          .setColor(LABEL_COLORS[track.label] ?? 0xff4500),
      ],
    });

    markAsPosted(track.id);
    await new Promise(r => setTimeout(r, 600));
  }

  cleanup();
  console.log(`Posted ${fresh.length} tracks.`);
  webhook.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
