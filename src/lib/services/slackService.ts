import { WebClient, Block, KnownBlock } from '@slack/web-api';

export class SlackService {
  private client: WebClient;

  constructor() {
interface SlackMessage {
  user?: string;
  ts?: string;
  client_msg_id?: string;
  attachments?: Array<{ from_url?: string }>;
  text?: string;
}

    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN is required');
    }
    this.client = new WebClient(token);
  }


  async getChannelMessagesWithCursor(channelId: string, limit: number = 100, oldest?: string, cursor?: string) {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit,
        oldest, // Unix timestamp
        cursor,
      });
      return {
        messages: result.messages || [],
        has_more: result.has_more,
        next_cursor: result.response_metadata?.next_cursor,
      };
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

  async scrapeChannelLinks(channelId: string, days: number = 7, senderFilter?: string) {
    try {
      // Calculate oldest timestamp for filtering
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let oldestTimestamp = Math.floor(cutoffDate.getTime() / 1000).toString();
      
      let allMessages: unknown[] = [];
      let hasMore = true;
      let cursor: string | undefined = undefined;
      // Paginate through all messages using next_cursor
      while (hasMore && allMessages.length < 50000) { // Safety limit
        const { messages, has_more, next_cursor } = await this.getChannelMessagesWithCursor(channelId, 1000, oldestTimestamp, cursor);
        if (!messages || messages.length === 0) {
          hasMore = false;
          break;
        }
        allMessages = allMessages.concat(messages);
        hasMore = !!has_more && !!next_cursor;
        cursor = next_cursor;
      }
      
      console.log(`Fetched ${allMessages.length} total messages for ${days} days`);
      
      interface SlackMessage {
        user?: string;
        ts?: string;
        client_msg_id?: string;
        attachments?: Array<{ from_url?: string }>;
        text?: string;
      }
      
      interface LinkResult {
        _id?: string;
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
        votes: {
          up: number;
          down: number;
        };
        comments: Array<{
          id: string;
          user: string;
          text: string;
          timestamp: Date;
        }>;
      }
      
      const links: LinkResult[] = [];

      for (const message of allMessages) {
        const msg = message as SlackMessage;
        if (!msg.user || !msg.ts) continue;

        const messageDate = new Date(parseFloat(msg.ts) * 1000);
        if (messageDate < cutoffDate) continue;

        const urls = this.extractLinksFromMessage(msg);

        if (urls.length > 0) {
          const userInfo = await this.getUserInfo(msg.user);
          
          // Apply sender filter if provided
          if (senderFilter && userInfo?.name !== senderFilter && userInfo?.real_name !== senderFilter) {
            continue;
          }

          for (const url of urls) {
            if (url && typeof url === 'string') {
              links.push({
                _id: msg.client_msg_id || msg.ts, // Use as temporary ID
                url: url.replace(/[<>]/g, ''), // Remove Slack's URL wrapping
                sender: {
                  id: msg.user,
                  name: userInfo?.real_name || userInfo?.name || 'Unknown',
                  avatar: userInfo?.profile?.image_72 || '',
                },
                timestamp: messageDate,
                slackMessageId: msg.client_msg_id || msg.ts,
                channel: {
                  id: channelId,
                  name: '', // Will be filled by the caller
                },
                votes: {
                  up: 0,
                  down: 0,
                },
                comments: [],
              });
            }
          }
        }
      }

      // Deduplicate by URL
      const uniqueLinks = Array.from(new Map(links.map(l => [l.url, l])).values());
      console.log(`Extracted ${uniqueLinks.length} unique links after filtering`);
      return uniqueLinks;
    } catch (error) {
      console.error('Error scraping channel links:', error);
      throw error;
    }
  }
}
