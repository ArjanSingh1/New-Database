import { getSlackLinks, SlackService } from '../src/lib/services/slackService';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
config();

const cachePath = path.join(__dirname, '../data/slackLinks.json');

async function fullCacheUpdate() {
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60;
  const links = await getSlackLinks({ from: fiveYearsAgo, to: now });
  fs.writeFileSync(cachePath, JSON.stringify(links, null, 2), 'utf-8');
  console.log(`Full cache: ${links.length} Slack links saved.`);
}

async function incrementalCacheUpdate() {
  const slack = new SlackService();
  const channelId = process.env.SLACK_CHANNEL_ID || '';
  if (!channelId) throw new Error('SLACK_CHANNEL_ID not set');
  let existingLinks: any[] = [];
  let lastTimestamp = 0;
  if (fs.existsSync(cachePath)) {
    const file = fs.readFileSync(cachePath, 'utf-8');
    existingLinks = JSON.parse(file);
    if (existingLinks.length > 0) {
      lastTimestamp = Math.max(...existingLinks.map(link => Math.floor(new Date(link.timestamp).getTime() / 1000)));
    }
  }
  console.log(`Incremental: Fetching new messages since ${lastTimestamp}`);
  const threeHoursAgo = Math.floor(Date.now() / 1000) - (3 * 60 * 60);
  const oldestTimestamp = Math.max(lastTimestamp - 300, threeHoursAgo);
  const newLinks = await slack.scrapeChannelLinks(channelId, 1, undefined);
  const filteredNewLinks = newLinks.filter(link => {
    const linkTimestamp = Math.floor(new Date(link.timestamp).getTime() / 1000);
    return linkTimestamp > lastTimestamp;
  });
  if (filteredNewLinks.length === 0) {
    console.log('No new links found');
    return;
  }
  const allLinks = [...filteredNewLinks, ...existingLinks];
  const uniqueLinks = Array.from(new Map(allLinks.map(link => [link.slackMessageId, link])).values());
  const finalLinks = uniqueLinks.slice(0, 1000);
  fs.writeFileSync(cachePath, JSON.stringify(finalLinks, null, 2), 'utf-8');
  console.log(`Incremental: Added ${filteredNewLinks.length} new links. Total cached: ${finalLinks.length}`);
}

// Usage: node slackCacheManager.js [full|incremental]
const mode = process.argv[2] || 'incremental';
if (mode === 'full') {
  fullCacheUpdate().catch(err => { console.error('Full cache error:', err); process.exit(1); });
} else {
  incrementalCacheUpdate().catch(err => { console.error('Incremental cache error:', err); process.exit(1); });
}
