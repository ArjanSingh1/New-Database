import { NextRequest } from 'next/server';
import { getSlackLinks } from '@/lib/services/slackService';
import * as fs from 'fs';
import * as path from 'path';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';

export async function GET(req: NextRequest) {
  try {
    console.log('Slack Links API called');
    const url = new URL(req.url);
    let from = url.searchParams.get('from');
    let to = url.searchParams.get('to');

    // If missing, default to last 7 days
    if (!from || !to) {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      from = weekAgo.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
      console.warn('[Slack Links API] Missing from/to params, defaulting to last 7 days', { from, to });
    }
    const sender = url.searchParams.get('sender') || undefined;
    const keyword = url.searchParams.get('keyword') || '';

    if (!from || !to) {
      console.error('[Slack Links API] Missing from/to params', { from, to });
      return new Response(JSON.stringify({ error: 'Missing from/to params' }), { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      console.error('[Slack Links API] Invalid date format', { from, to });
      return new Response(JSON.stringify({ error: 'Invalid date format' }), { status: 400 });
    }
    const fromTs = Math.floor(fromDate.getTime() / 1000);
    const toTs = Math.floor(toDate.getTime() / 1000);

    // Add logging for debugging
    console.log(`[Slack Links API] from: ${from} (${fromTs}), to: ${to} (${toTs}), sender: ${sender}, keyword: ${keyword}`);

    // Try to read from cache first
    let links = [];
    const cachePath = path.join(process.cwd(), 'data', 'slackLinks.json');
    if (fs.existsSync(cachePath)) {
      const file = fs.readFileSync(cachePath, 'utf-8');
      const allLinks = JSON.parse(file);
      // Filter by date, sender, keyword
      links = allLinks.filter((link: { timestamp: string; sender?: { name?: string }; url: string; comments?: Array<{ text: string }> }) => {
        const ts = Math.floor(new Date(link.timestamp).getTime() / 1000);
        const matchesDate = ts >= fromTs && ts <= toTs;
        const matchesSender = !sender || link.sender?.name === sender;
        const matchesKeyword = !keyword || link.url.toLowerCase().includes(keyword.toLowerCase()) || (link.comments || []).some((c: { text: string }) => c.text.toLowerCase().includes(keyword.toLowerCase()));
        return matchesDate && matchesSender && matchesKeyword;
      });
      console.log(`[Slack Links API] Served ${links.length} links from cache.`);
    } else {
      // Fallback: fetch from Slack API if cache is missing
      try {
        links = await getSlackLinks({ from: fromTs, to: toTs, sender, keyword });
      } catch (fetchErr) {
        console.error('[Slack Links API] getSlackLinks error:', fetchErr);
        return new Response(JSON.stringify({ error: 'Failed to fetch Slack links', details: fetchErr instanceof Error ? fetchErr.message : fetchErr }), { status: 500 });
      }
    }

    // Save to MongoDB and get back with proper IDs (optional, fallback to cache data if DB fails)
    let savedLinks = [];
    try {
      await connectDB();
      for (const link of links) {
        try {
          const existingLink = await Link.findOne({ slackMessageId: link.slackMessageId });
          if (existingLink) {
            savedLinks.push(existingLink);
          } else {
            const newLink = new Link({
              url: link.url,
              sender: link.sender,
              timestamp: link.timestamp,
              slackMessageId: link.slackMessageId,
              channel: link.channel,
              votes: { up: 0, down: 0 },
              comments: []
            });
            const saved = await newLink.save();
            savedLinks.push(saved);
          }
        } catch (dbError) {
          console.error('Error saving individual link:', dbError);
          // If DB save fails, still return the link with temp ID
          savedLinks.push(link);
        }
      }
    } catch (dbConnectionError) {
      console.error('MongoDB connection failed, using cache data directly:', dbConnectionError);
      // If MongoDB connection fails entirely, just use the cached data
      savedLinks = links;
    }

    return new Response(JSON.stringify({ links: savedLinks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Slack links API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch Slack links',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
