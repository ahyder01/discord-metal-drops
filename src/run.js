require('dotenv').config();
const { WebhookClient, EmbedBuilder } = require('discord.js');
const { fetchNewTracks } = require('./youtube');
const { hasBeenPosted, markAsPosted, cleanup } = require('./db');

const GENRE_COLORS = {
  'Metalcore':         0xe74c3c,
  'Deathcore':         0x8b0000,
  'Hardcore':          0xff6600,
  'Post-Hardcore':     0x9b59b6,
  'Melodic Metalcore': 0x3498db,
  'Beatdown Hardcore': 0xff4500,
  'Mathcore':          0x1abc9c,
};

const MAX_PER_RUN = 15;

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

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  await webhook.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🤘 New Metal Drops — ${dateStr}`)
        .setDescription(`**${fresh.length}** fresh track${fresh.length !== 1 ? 's' : ''} across metalcore, deathcore, hardcore & more.`)
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
            { name: 'Genre',    value: track.genre,          inline: true },
            { name: 'Released', value: `<t:${tsSeconds}:R>`, inline: true },
          )
          .setColor(GENRE_COLORS[track.genre] ?? 0xff4500),
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
