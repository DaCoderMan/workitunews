const express = require('express');
const session = require('express-session');
const cron = require('node-cron');
const path = require('path');
const config = require('./config');
const newsService = require('./services/newsService');
const emailService = require('./services/emailService');
const userService = require('./services/userService');
const { requireAuth, requireGuest } = require('./middleware/auth');

const app = express();

// Session middleware (must be before other middleware)
app.use(session({
  name: config.session.name,
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie
}));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Authentication Routes (public)
app.get('/login', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Registration endpoint (public)
app.post('/api/register', requireGuest, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await userService.createUser(username, password, email || '');

    // Auto-login after registration
    req.session.authenticated = true;
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'An error occurred during registration'
    });
  }
});

// Login endpoint
app.post('/api/login', requireGuest, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Authenticate user
    const user = await userService.authenticate(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Create session
    req.session.authenticated = true;
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
});

// Logout endpoint
app.get('/api/logout', requireAuth, (req, res) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'Error logging out'
      });
    }
    // Clear cookie
    res.clearCookie(config.session.name);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Protected Routes
// Serve frontend (protected)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Get current news (protected)
app.get('/api/news', requireAuth, async (req, res) => {
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

// Manually trigger news fetch and email send (protected)
app.get('/api/refresh', requireAuth, async (req, res) => {
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

// Health check endpoint (protected)
app.get('/api/health', requireAuth, (req, res) => {
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
