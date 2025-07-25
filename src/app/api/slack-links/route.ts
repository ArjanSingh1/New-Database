import { NextRequest } from 'next/server';
import { getSlackLinks } from '@/lib/services/slackService';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';

export async function GET(req: NextRequest) {
  try {
    console.log('Slack Links API called');
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
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

    let links;
    try {
      links = await getSlackLinks({ from: fromTs, to: toTs, sender, keyword });
    } catch (fetchErr) {
      console.error('[Slack Links API] getSlackLinks error:', fetchErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch Slack links', details: fetchErr instanceof Error ? fetchErr.message : fetchErr }), { status: 500 });
    }

    // Save to MongoDB and get back with proper IDs
    await connectDB();
    const savedLinks = [];
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
        console.error('Error saving link:', dbError);
        // If DB save fails, still return the link with temp ID
        savedLinks.push(link);
      }
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
