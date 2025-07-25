import { WebClient } from '@slack/web-api';

export class SlackService {
  private client: WebClient;

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN is required');
    }
    this.client = new WebClient(token);
  }

  async getChannelMessages(channelId: string, limit: number = 100) {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit,
      });

      return result.messages || [];
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      throw error;
    }
  }

  async getUserInfo(userId: string) {
    try {
      const result = await this.client.users.info({
        user: userId,
      });

      return result.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  async sendMessage(channelId: string, text: string, blocks?: any[]) {
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
      });

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  extractLinksFromMessage(message: any) {
    const text = message.text || '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    // Also check for attachments or link unfurls
    const attachmentUrls = message.attachments?.map((att: any) => att.from_url).filter(Boolean) || [];
    
    return [...urls, ...attachmentUrls];
  }

  async scrapeChannelLinks(channelId: string) {
    try {
      const messages = await this.getChannelMessages(channelId, 1000);
      const links = [];

      for (const message of messages) {
        if (!message.user || !message.ts) continue;

        const urls = this.extractLinksFromMessage(message);
        
        if (urls.length > 0) {
          const userInfo = await this.getUserInfo(message.user);
          
          for (const url of urls) {
            links.push({
              url: url.replace(/[<>]/g, ''), // Remove Slack's URL wrapping
              sender: {
                id: message.user,
                name: userInfo?.real_name || userInfo?.name || 'Unknown',
                avatar: userInfo?.profile?.image_72 || '',
              },
              timestamp: new Date(parseFloat(message.ts) * 1000),
              slackMessageId: message.client_msg_id || message.ts,
              channel: {
                id: channelId,
                name: '', // Will be filled by the caller
              },
            });
          }
        }
      }

      return links;
    } catch (error) {
      console.error('Error scraping channel links:', error);
      throw error;
    }
  }
}
