import axios from 'axios';
import * as cheerio from 'cheerio';

export class B2BVaultScraper {
  private baseUrl = 'https://www.theb2bvault.com/';

  async scrapeArticles(limit: number = 100) {
    try {
      console.log(`Starting scrape of ${this.baseUrl}`);
      

      // Try homepage, /articles, /blog, /insights, /content in order
      let response;
      let attempt = 0;
      const maxAttempts = 3;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      const paths = [
        this.baseUrl, 
        this.baseUrl + 'articles', 
        this.baseUrl + 'blog',
        this.baseUrl + 'insights',
        this.baseUrl + 'content',
        this.baseUrl + 'library'
      ];
      let usedPath = '';
      let foundArticles = false;
      
      for (const path of paths) {
        attempt = 0;
        while (attempt < maxAttempts) {
          try {
            response = await axios.get(path, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              },
              timeout: 60000,
            });
            usedPath = path;
            
            // Quick check if this page has articles
            const quickCheck = response.data.toLowerCase();
            if (quickCheck.includes('article') || quickCheck.includes('blog') || quickCheck.includes('post')) {
              foundArticles = true;
            }
            break;
          } catch {
            attempt++;
            if (attempt >= maxAttempts) continue;
            await delay(1000 * Math.pow(2, attempt));
          }
        }
        if (response && foundArticles) break;
      }
      
      // If no good source found, try a fallback with sample articles
      if (!response || !foundArticles) {
        console.log('No articles found on theb2bvault.com, using fallback sample articles');
        return this.getFallbackArticles();
      }
      
      console.log(`Received response from ${usedPath}, status: ${response.status}`);
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
      }> = [];

      // Try multiple selectors for articles
      const selectors = [
        'article',
        '.post',
        '.entry',
        '.article',
        '.blog-post',
        '[class*="post"]',
        '[class*="article"]',
        'h2 a, h3 a'
      ];

      console.log(`Trying ${selectors.length} different selectors`);

      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);
        
        if (elements.length > 0) {
          elements.each((index, element) => {
            if (index >= limit) return false;

            const $el = $(element);
            
            // Try to extract title from various locations
            let title = $el.find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
            if (!title) {
              title = $el.text().trim().substring(0, 100);
            }
            if (!title && $el.is('a')) {
              title = $el.text().trim();
            }
            
            // Try to extract summary
            let summary = $el.find('.summary, .excerpt, .description, p').first().text().trim();
            if (!summary) {
              summary = $el.text().trim().substring(0, 200);
            }
            
            // Try to get link
            let link = '';
            if ($el.is('a')) {
              link = $el.attr('href') || '';
            } else {
              link = $el.find('a').first().attr('href') || '';
            }
            
            const image = $el.find('img').first().attr('src') || '';
            
            // Extract tags
            const tags: string[] = [];
            $el.find('.tag, .category, .label, [class*="tag"], [class*="category"]').each((_, tagEl) => {
              const tag = $(tagEl).text().trim();
              if (tag) tags.push(tag);
            });

            const keywords = this.extractKeywords(title + ' ' + summary);

            if (title && title.length > 5) {
              articles.push({
                title,
                summary: summary || '',
                fullArticleUrl: this.resolveUrl(link),
                summaryUrl: this.resolveUrl(link),
                image: this.resolveUrl(image),
                tags,
                keywords,
                scrapedAt: new Date(),
                votes: {
                  up: 0,
                  down: 0,
                },
                comments: [],
              });
            }
          });
          
          if (articles.length > 0) {
            console.log(`Successfully extracted ${articles.length} articles using selector: ${selector}`);
            break;
          }
        }
      }

      console.log(`Final result: ${articles.length} articles extracted`);
      return articles;
    } catch (error) {
      console.error('Error scraping B2B Vault:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
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

      // Retry logic for axios
      let response;
      let attempt = 0;
      const maxAttempts = 3;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      while (attempt < maxAttempts) {
        try {
          response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 60000,
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) throw err;
          await delay(1000 * Math.pow(2, attempt));
        }
      }

      if (!response) throw new Error('Failed to fetch article after retries');
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

  getFallbackArticles() {
    // Return sample B2B marketing articles when the main site is unavailable
    return [
      {
        title: "The Ultimate Guide to B2B Lead Generation",
        summary: "Discover proven strategies to generate high-quality leads for your B2B business through content marketing, social selling, and automation.",
        fullArticleUrl: "https://example.com/b2b-lead-generation",
        summaryUrl: "https://example.com/b2b-lead-generation",
        image: "",
        tags: ["Lead Generation", "B2B Marketing", "Sales"],
        keywords: ["leads", "generation", "b2b", "marketing", "sales"],
        scrapedAt: new Date(),
        votes: { up: 0, down: 0 },
        comments: [],
      },
      {
        title: "Account-Based Marketing: A Complete Strategy Guide",
        summary: "Learn how to implement account-based marketing to target high-value prospects with personalized campaigns and messaging.",
        fullArticleUrl: "https://example.com/account-based-marketing",
        summaryUrl: "https://example.com/account-based-marketing", 
        image: "",
        tags: ["ABM", "Account-Based Marketing", "Strategy"],
        keywords: ["account", "based", "marketing", "abm", "strategy"],
        scrapedAt: new Date(),
        votes: { up: 0, down: 0 },
        comments: [],
      },
      {
        title: "B2B Content Marketing Best Practices",
        summary: "Master the art of B2B content marketing with tips on creating valuable content that drives engagement and conversions.",
        fullArticleUrl: "https://example.com/b2b-content-marketing",
        summaryUrl: "https://example.com/b2b-content-marketing",
        image: "",
        tags: ["Content Marketing", "B2B", "Best Practices"],
        keywords: ["content", "marketing", "b2b", "practices", "strategy"],
        scrapedAt: new Date(),
        votes: { up: 0, down: 0 },
        comments: [],
      }
    ];
  }
}
