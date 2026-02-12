require('dotenv').config();

module.exports = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || 'sk-6ed46ee9806d4d95830d14df7a3def6c',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  email: {
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    recipient: process.env.RECIPIENT_EMAIL
  },
  server: {
    port: process.env.PORT || 3000
  },
  schedule: {
    interval: '0 */12 * * *' // Every 12 hours
  },
  rssFeeds: {
    tech: [
      'https://techcrunch.com/feed/',
      'https://www.theverge.com/rss/index.xml',
      'https://arstechnica.com/feed/',
      'https://www.wired.com/feed/rss',
      'https://feeds.feedburner.com/oreilly/radar'
    ],
    business: [
      'https://www.bloomberg.com/feed/topics/technology',
      'https://feeds.reuters.com/reuters/businessNews',
      'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      'https://feeds.feedburner.com/entrepreneur/latest',
      'https://www.forbes.com/real-time/feed2/'
    ]
  }
};
