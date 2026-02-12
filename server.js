const express = require('express');
const cron = require('node-cron');
const path = require('path');
const config = require('./config');
const newsService = require('./services/newsService');
const emailService = require('./services/emailService');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Get current news
app.get('/api/news', async (req, res) => {
  try {
    const news = newsService.getCachedNews();
    const lastFetchTime = newsService.getLastFetchTime();

    res.json({
      success: true,
      articles: news,
      count: news.length,
      lastFetchTime: lastFetchTime,
      message: news.length > 0 
        ? 'News retrieved successfully' 
        : 'No news available. Please trigger a refresh.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger news fetch and email send
app.get('/api/refresh', async (req, res) => {
  try {
    console.log('Manual refresh triggered...');
    const articles = await newsService.fetchNews();
    const fetchTime = newsService.getLastFetchTime();
    
    // Send email
    const emailSent = await emailService.sendNewsEmail(articles, fetchTime);
    
    res.json({
      success: true,
      articles: articles,
      count: articles.length,
      fetchTime: fetchTime,
      emailSent: emailSent,
      message: `Fetched ${articles.length} articles. Email ${emailSent ? 'sent' : 'failed to send'}.`
    });
  } catch (error) {
    console.error('Error in refresh endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const lastFetchTime = newsService.getLastFetchTime();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lastFetchTime: lastFetchTime,
    cachedArticlesCount: newsService.getCachedNews().length
  });
});

// Scheduled job: Fetch news and send email every 12 hours
async function scheduledNewsUpdate() {
  try {
    console.log('Scheduled news update started...');
    const articles = await newsService.fetchNews();
    const fetchTime = newsService.getLastFetchTime();
    
    console.log(`Fetched ${articles.length} articles at ${fetchTime}`);
    
    // Send email
    const emailSent = await emailService.sendNewsEmail(articles, fetchTime);
    
    if (emailSent) {
      console.log('Email sent successfully');
    } else {
      console.log('Email failed to send');
    }
  } catch (error) {
    console.error('Error in scheduled news update:', error);
  }
}

// Initialize: Fetch news on startup
async function initialize() {
  try {
    console.log('Initializing... Fetching initial news...');
    await scheduledNewsUpdate();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Start scheduled job
console.log('Setting up scheduled job:', config.schedule.interval);
cron.schedule(config.schedule.interval, scheduledNewsUpdate);

// Start server
const PORT = config.server.port;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Initializing news fetch...');
  await initialize();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
