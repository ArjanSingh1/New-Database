import { NextRequest } from 'next/server';
import { SlackService } from '@/lib/services/slackService';

export async function GET(req: NextRequest) {
  try {
    const slack = new SlackService();
    const channelId = process.env.SLACK_CHANNEL_ID!;
    const links = await slack.scrapeChannelLinks(channelId);
    return new Response(JSON.stringify({ links }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Slack links' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
