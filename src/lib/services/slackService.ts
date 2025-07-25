import { WebClient, Block, KnownBlock } from '@slack/web-api';

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

  async sendMessage(channelId: string, text: string, blocks?: (Block | KnownBlock)[]) {
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

  extractLinksFromMessage(message: unknown): string[] {
    interface MessageType {
      text?: string;
      attachments?: Array<{ from_url?: string }>;
    }
    
    const typedMessage = message as MessageType;
    const text = typedMessage.text || '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    const attachments = typedMessage.attachments || [];
    const attachmentUrls: string[] = [];
    
    for (const attachment of attachments) {
      if (attachment.from_url && typeof attachment.from_url === 'string') {
        attachmentUrls.push(attachment.from_url);
      }
    }
    
    return [...urls, ...attachmentUrls];
  }

  async scrapeChannelLinks(channelId: string) {
    try {
      const messages = await this.getChannelMessages(channelId, 1000);
      
      interface SlackMessage {
        user?: string;
        ts?: string;
        client_msg_id?: string;
        attachments?: Array<{ from_url?: string }>;
        text?: string;
      }
      
      interface LinkResult {
        url: string;
        sender: {
          id: string;
          name: string;
          avatar: string;
        };
        timestamp: Date;
        slackMessageId: string;
        channel: {
          id: string;
          name: string;
        };
      }
      
      const links: LinkResult[] = [];

      for (const message of messages as unknown[]) {
        const msg = message as SlackMessage;
        if (!msg.user || !msg.ts) continue;

        const urls = this.extractLinksFromMessage(msg);

        if (urls.length > 0) {
          const userInfo = await this.getUserInfo(msg.user);

          for (const url of urls) {
            if (url && typeof url === 'string') {
              links.push({
                url: url.replace(/[<>]/g, ''), // Remove Slack's URL wrapping
                sender: {
                  id: msg.user,
                  name: userInfo?.real_name || userInfo?.name || 'Unknown',
                  avatar: userInfo?.profile?.image_72 || '',
                },
                timestamp: new Date(parseFloat(msg.ts) * 1000),
                slackMessageId: msg.client_msg_id || msg.ts,
                channel: {
                  id: channelId,
                  name: '', // Will be filled by the caller
                },
              });
            }
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
