import axios from 'axios';
import * as cheerio from 'cheerio';

export class B2BVaultScraper {
  private baseUrl = 'https://b2bvault.com'; // Replace with actual B2B Vault URL

  async scrapeArticles(limit: number = 100) {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const articles: Array<{
        title: string;
        summary: string;
        fullArticleUrl: string;
        summaryUrl: string;
        image: string;
        tags: string[];
        keywords: string[];
        scrapedAt: Date;
      }> = [];

      // This selector will need to be updated based on the actual B2B Vault website structure
      $('.article-card, .post-card, [data-testid="article-card"]').each((index, element) => {
        if (index >= limit) return false;

        const $el = $(element);
        const title = $el.find('h2, h3, .title, [data-testid="article-title"]').first().text().trim();
        const summary = $el.find('.summary, .excerpt, .description, p').first().text().trim();
        const image = $el.find('img').first().attr('src') || '';
        
        // Look for "read full article" and "read summary" buttons
        const fullArticleBtn = $el.find('a:contains("read full article"), a:contains("Read Full Article"), .read-more, .full-article-link');
        const summaryBtn = $el.find('a:contains("read summary"), a:contains("Read Summary"), .summary-link');
        
        const fullArticleUrl = this.resolveUrl(fullArticleBtn.attr('href') || '');
        const summaryUrl = this.resolveUrl(summaryBtn.attr('href') || '');

        // Extract tags from various possible locations
        const tags: string[] = [];
        $el.find('.tag, .category, .label, [data-testid="tag"]').each((_, tagEl) => {
          const tag = $(tagEl).text().trim();
          if (tag) tags.push(tag);
        });

        // Extract keywords from title and summary
        const keywords = this.extractKeywords(title + ' ' + summary);

        if (title && (fullArticleUrl || summaryUrl)) {
          articles.push({
            title,
            summary: summary || '',
            fullArticleUrl,
            summaryUrl,
            image: this.resolveUrl(image),
            tags,
            keywords,
            scrapedAt: new Date(),
          });
        }
      });

      return articles;
    } catch (error) {
      console.error('Error scraping B2B Vault:', error);
      throw error;
    }
  }

  private resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'your', 'what', 'when', 'where', 'more'].includes(word));

    // Get unique words and return top 10
    return [...new Set(words)].slice(0, 10);
  }

  async scrapeArticleContent(url: string) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract article content
      const title = $('h1, .article-title, [data-testid="article-title"]').first().text().trim();
      const content = $('.article-content, .post-content, .content, main article').first().text().trim();
      
      return {
        title,
        content,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error scraping article content:', error);
      return null;
    }
  }
}
