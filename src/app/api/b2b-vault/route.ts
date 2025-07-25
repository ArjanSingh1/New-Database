
import { NextRequest } from 'next/server';
import { B2BVaultScraper } from '@/lib/services/b2bVaultScraper';
import connectDB from '@/lib/database';
import { Article } from '@/lib/models/Article';

export async function GET(req: NextRequest) {
  let articles = [];
  let scrapeError = null;
  try {
    console.log('B2B Vault API called');
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    console.log(`Fetching up to ${limit} articles`);
    
    const scraper = new B2BVaultScraper();
    articles = await scraper.scrapeArticles(limit);
    
    if (articles.length > 0) {
      // Optionally, upsert to DB for caching
      await connectDB();
      for (const article of articles) {
        await Article.updateOne(
          { fullArticleUrl: article.fullArticleUrl },
          { $set: article },
          { upsert: true }
        );
      }
    }
    console.log(`Found ${articles.length} articles`);
    return new Response(JSON.stringify({ articles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    scrapeError = error;
    console.error('B2B Vault API error:', error);
  }
  // Fallback: try to read from DB
  try {
    await connectDB();
    articles = await Article.find().sort({ scrapedAt: -1 }).limit(50).lean();
    if (articles.length > 0) {
      return new Response(JSON.stringify({ articles, fallback: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (dbError) {
    console.error('B2B Vault DB fallback error:', dbError);
  }
  // If both fail
  return new Response(JSON.stringify({ 
    error: 'Failed to scrape B2B Vault and no cached articles available',
    details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
