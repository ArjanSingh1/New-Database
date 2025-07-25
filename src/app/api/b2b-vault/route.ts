import { NextRequest } from 'next/server';
import { B2BVaultScraper } from '@/lib/services/b2bVaultScraper';

export async function GET(_req: NextRequest) {
  try {
    const scraper = new B2BVaultScraper();
    const articles = await scraper.scrapeArticles(100);
    return new Response(JSON.stringify({ articles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Failed to scrape B2B Vault' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
