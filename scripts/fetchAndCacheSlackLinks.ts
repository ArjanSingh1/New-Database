import { getSlackLinks } from '../src/lib/services/slackService';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  // Fetch all links for a large date range (e.g., 5 years)
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60;
  const links = await getSlackLinks({ from: fiveYearsAgo, to: now });
  const outPath = path.join(__dirname, '../data/slackLinks.json');
  fs.writeFileSync(outPath, JSON.stringify(links, null, 2), 'utf-8');
  console.log(`Cached ${links.length} Slack links to ${outPath}`);
}

main().catch(err => {
  console.error('Error fetching and caching Slack links:', err);
  process.exit(1);
});
