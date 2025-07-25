import { NextRequest } from 'next/server';
import { SlackService } from '@/lib/services/slackService';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  try {
    const slack = new SlackService();
    const channelId = process.env.SLACK_CHANNEL_ID!;
    const links = await slack.scrapeChannelLinks(channelId);
    return new Response(JSON.stringify({ links }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Slack links' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
