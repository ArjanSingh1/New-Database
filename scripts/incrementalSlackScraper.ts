import { SlackService } from '../src/lib/services/slackService';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  const slack = new SlackService();
  const channelId = process.env.SLACK_CHANNEL_ID || '';
  if (!channelId) throw new Error('SLACK_CHANNEL_ID not set');

  const cachePath = path.join(__dirname, '../data/slackLinks.json');
  let existingLinks: any[] = [];
  let lastTimestamp = 0;

  // Load existing cache if it exists
  if (fs.existsSync(cachePath)) {
    const file = fs.readFileSync(cachePath, 'utf-8');
    existingLinks = JSON.parse(file);
    
    // Find the most recent timestamp to avoid duplicates
    if (existingLinks.length > 0) {
      lastTimestamp = Math.max(...existingLinks.map(link => 
        Math.floor(new Date(link.timestamp).getTime() / 1000)
      ));
    }
  }

  console.log(`Fetching new messages since timestamp: ${lastTimestamp}`);
  
  // Fetch only recent messages (last 3 hours worth, with some overlap)
  const threeHoursAgo = Math.floor(Date.now() / 1000) - (3 * 60 * 60);
  const oldestTimestamp = Math.max(lastTimestamp - 300, threeHoursAgo); // 5 min overlap to avoid gaps
  
  // Scrape recent links (small batch to avoid rate limits)
  const newLinks = await slack.scrapeChannelLinks(channelId, 1, undefined); // Only 1 day, recent messages
  
  // Filter to only truly new links (newer than our last timestamp)
  const filteredNewLinks = newLinks.filter(link => {
    const linkTimestamp = Math.floor(new Date(link.timestamp).getTime() / 1000);
    return linkTimestamp > lastTimestamp;
  });

  if (filteredNewLinks.length === 0) {
    console.log('No new links found');
    return;
  }

  // Merge new links with existing ones (new links first for chronological order)
  const allLinks = [...filteredNewLinks, ...existingLinks];
  
  // Remove duplicates by slackMessageId
  const uniqueLinks = Array.from(
    new Map(allLinks.map(link => [link.slackMessageId, link])).values()
  );

  // Limit total cache size (keep last 1000 links to prevent file from growing too large)
  const finalLinks = uniqueLinks.slice(0, 1000);

  // Save back to cache
  fs.writeFileSync(cachePath, JSON.stringify(finalLinks, null, 2), 'utf-8');
  console.log(`Added ${filteredNewLinks.length} new links. Total cached: ${finalLinks.length}`);
}

main().catch(err => {
  console.error('Error in incremental scraper:', err);
  process.exit(1);
});
