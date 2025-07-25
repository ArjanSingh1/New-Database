import { NextRequest } from 'next/server';
import { SlackService } from '@/lib/services/slackService';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';

export async function GET(req: NextRequest) {
  try {
    console.log('Slack Links API called');
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    const sender = url.searchParams.get('sender') || undefined;
    
    console.log(`Fetching links for ${days} days, sender: ${sender || 'all'}`);
    
    const slack = new SlackService();
    const channelId = process.env.SLACK_CHANNEL_ID!;
    const links = await slack.scrapeChannelLinks(channelId, days, sender);
    
    console.log(`Found ${links.length} links`);
    
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
