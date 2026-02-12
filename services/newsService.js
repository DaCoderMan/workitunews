const axios = require('axios');
const RSSParser = require('rss-parser');
const config = require('../config');

const parser = new RSSParser({
  customFields: {
    item: ['media:content', 'media:thumbnail']
  }
});

class NewsService {
  constructor() {
    this.cachedNews = [];
    this.lastFetchTime = null;
  }

  /**
   * Fetch news using RSS feeds and curate with DeepSeek API
   * Combines tech and business news, uses DeepSeek to rank, and returns top 30
   */
  async fetchNews() {
    try {
      console.log('Fetching news from RSS feeds...');
      
      // Fetch articles from RSS feeds
      const allArticles = await this.fetchFromRSSFeeds();
      
      if (allArticles.length === 0) {
        console.log('No articles fetched from RSS feeds');
        if (this.cachedNews.length > 0) {
          return this.cachedNews;
        }
        throw new Error('No news articles available');
      }

      console.log(`Fetched ${allArticles.length} articles from RSS feeds`);

      // Use DeepSeek API to curate and rank articles
      const curatedArticles = await this.curateWithDeepSeek(allArticles);

      // Update cache
      this.cachedNews = curatedArticles;
      this.lastFetchTime = new Date();

      return curatedArticles;
    } catch (error) {
      console.error('Error fetching news:', error.message);
      // Return cached news if available
      if (this.cachedNews.length > 0) {
        console.log('Returning cached news due to error');
        return this.cachedNews;
      }
      throw error;
    }
  }

  /**
   * Fetch articles from RSS feeds
   */
  async fetchFromRSSFeeds() {
    const allArticles = [];
    const allFeeds = config.rssFeeds.trending;

    // Fetch from all feeds in parallel
    const feedPromises = allFeeds.map(feedUrl => this.fetchFeed(feedUrl));
    const results = await Promise.allSettled(feedPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allArticles.push(...result.value);
      } else {
        console.warn(`Failed to fetch feed ${allFeeds[index]}:`, result.reason?.message);
      }
    });

    // Deduplicate articles
    return this.deduplicateArticles(allArticles);
  }

  /**
   * Fetch articles from a single RSS feed
   */
  async fetchFeed(feedUrl) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const articles = [];

      if (feed.items && feed.items.length > 0) {
        feed.items.forEach(item => {
          // Get image from media:content or media:thumbnail or enclosure
          let imageUrl = null;
          if (item['media:content'] && item['media:content'].$.url) {
            imageUrl = item['media:content'].$.url;
          } else if (item['media:thumbnail'] && item['media:thumbnail'].$.url) {
            imageUrl = item['media:thumbnail'].$.url;
          } else if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
            imageUrl = item.enclosure.url;
          }

          articles.push({
            title: item.title || 'No title',
            description: item.contentSnippet || item.content || item.description || '',
            url: item.link || '',
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            source: {
              name: feed.title || 'Unknown Source'
            },
            urlToImage: imageUrl
          });
        });
      }

      return articles.filter(article => 
        article.title && 
        article.url &&
        article.title !== '[Removed]' &&
        article.title.length > 10
      );
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error.message);
      return [];
    }
  }

  /**
   * Use DeepSeek API to curate and rank articles
   */
  async curateWithDeepSeek(articles) {
    try {
      console.log('Curating articles with DeepSeek API...');

      // Prepare article summaries for DeepSeek
      const articleSummaries = articles.slice(0, 100).map((article, index) => ({
        index: index,
        title: article.title,
        description: article.description?.substring(0, 300) || '',
        source: article.source?.name || 'Unknown'
      }));

      const prompt = `You are a news curator for a tech business owner in Israel. Analyze the following news articles and return the top 30 most relevant and TRENDING articles about technology and business.

Focus on TRENDING and VIRAL content:
- Stories gaining traction on social media (X/Twitter)
- Viral tech and business news
- Trending topics and discussions
- Breaking news that's going viral
- Major tech industry developments that are trending
- Business news making waves online

Prioritize articles that are:
- Currently trending on social media
- Gaining viral attention
- Being widely discussed online
- Breaking news stories

Return ONLY a JSON array of indices (0-based) of the top 30 TRENDING articles, sorted by trending relevance and viral potential. Format: [0, 5, 12, ...]

Articles:
${JSON.stringify(articleSummaries, null, 2)}

Return only the JSON array, nothing else.`;

      const response = await axios.post(
        `${config.deepseek.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${config.deepseek.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract indices from response
      const content = response.data.choices[0].message.content.trim();
      let selectedIndices = [];

      try {
        // Try to parse JSON array from response
        const jsonMatch = content.match(/\[[\d\s,]+\]/);
        if (jsonMatch) {
          selectedIndices = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: extract numbers
          const numbers = content.match(/\d+/g);
          if (numbers) {
            selectedIndices = numbers.map(n => parseInt(n)).slice(0, 30);
          }
        }
      } catch (parseError) {
        console.warn('Error parsing DeepSeek response, using fallback selection');
        // Fallback: select first 30 articles sorted by date
        selectedIndices = articles
          .map((_, i) => i)
          .sort((a, b) => new Date(articles[b].publishedAt) - new Date(articles[a].publishedAt))
          .slice(0, 30);
      }

      // Ensure we have valid indices and limit to 30
      const validIndices = selectedIndices
        .filter(idx => idx >= 0 && idx < articles.length)
        .slice(0, 30);

      // If we don't have enough, fill with newest articles
      if (validIndices.length < 30) {
        const usedIndices = new Set(validIndices);
        const remaining = articles
          .map((_, i) => i)
          .filter(i => !usedIndices.has(i))
          .sort((a, b) => new Date(articles[b].publishedAt) - new Date(articles[a].publishedAt))
          .slice(0, 30 - validIndices.length);
        validIndices.push(...remaining);
      }

      const curatedArticles = validIndices.map(idx => articles[idx]);

      // Sort by published date (newest first)
      curatedArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      console.log(`Curated ${curatedArticles.length} articles using DeepSeek API`);
      return curatedArticles.slice(0, 30);
    } catch (error) {
      console.error('Error curating with DeepSeek:', error.message);
      if (error.response) {
        console.error('DeepSeek API response:', error.response.data);
      }
      
      // Fallback: return top 30 newest articles
      console.log('Using fallback: returning top 30 newest articles');
      return articles
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 30);
    }
  }

  /**
   * Deduplicate articles based on title and URL
   */
  deduplicateArticles(articles) {
    const seen = new Set();
    const unique = [];

    for (const article of articles) {
      const titleKey = article.title?.toLowerCase().trim();
      const urlKey = article.url?.toLowerCase().trim();
      
      if (!titleKey || !urlKey) continue;

      const key = `${titleKey}_${urlKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    return unique;
  }

  /**
   * Get cached news
   */
  getCachedNews() {
    return this.cachedNews;
  }

  /**
   * Get last fetch time
   */
  getLastFetchTime() {
    return this.lastFetchTime;
  }
}

module.exports = new NewsService();
