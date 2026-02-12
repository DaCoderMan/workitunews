# Personal Tech & Business News Aggregator

A Node.js/Express application that aggregates the 30 most relevant tech and business news articles, displays them on a modern web page, and automatically sends formatted email updates every 12 hours.

## Features

- 📰 Fetches 30 most relevant tech and business news articles
- 🌐 Modern, responsive web interface
- 📧 Automated email updates every 12 hours
- 🔄 Manual refresh capability
- ⚡ Auto-refresh on the web page (every 30 minutes)
- 🎨 Professional, business-owner friendly design
- 📱 Mobile-responsive layout

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- DeepSeek API key (provided or get one from [deepseek.com](https://www.deepseek.com))
- Gmail account with App Password enabled

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. DeepSeek API Key

The DeepSeek API key is already configured in `.env.example`. If you need a different key:
1. Visit [https://www.deepseek.com](https://www.deepseek.com)
2. Sign up and get your API key
3. Update the `DEEPSEEK_API_KEY` in your `.env` file

### 3. Set Up Gmail App Password

1. Go to your Google Account settings
2. Navigate to **Security** → **2-Step Verification** (enable if not already enabled)
3. Go to **App Passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password (you'll need it for the `.env` file)

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   (On Linux/Mac: `cp .env.example .env`)

2. Edit `.env` and fill in your credentials:
   ```
   DEEPSEEK_API_KEY=sk-6ed46ee9806d4d95830d14df7a3def6c
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_16_character_app_password
   RECIPIENT_EMAIL=your_email@gmail.com
   PORT=3000
   ```

### 5. Run the Application

```bash
npm start
```

The server will:
- Start on `http://localhost:3000`
- Fetch initial news on startup
- Send an email with the news
- Set up automatic updates every 12 hours

### 6. Access the Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
workitu-new/
├── package.json          # Project dependencies and scripts
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment variables
├── .gitignore           # Git ignore rules
├── config.js            # Configuration loader
├── server.js            # Express server and main application
├── services/
│   ├── newsService.js   # News fetching logic
│   └── emailService.js  # Email sending logic
└── public/
    ├── index.html       # Frontend HTML
    ├── style.css        # Frontend styles
    └── script.js        # Frontend JavaScript
```

## API Endpoints

### `GET /`
Serves the main web page.

### `GET /api/news`
Returns the current cached news articles.

**Response:**
```json
{
  "success": true,
  "articles": [...],
  "count": 30,
  "lastFetchTime": "2026-02-12T19:00:00.000Z",
  "message": "News retrieved successfully"
}
```

### `GET /api/refresh`
Manually triggers a news fetch and email send.

**Response:**
```json
{
  "success": true,
  "articles": [...],
  "count": 30,
  "fetchTime": "2026-02-12T19:00:00.000Z",
  "emailSent": true,
  "message": "Fetched 30 articles. Email sent."
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T19:00:00.000Z",
  "lastFetchTime": "2026-02-12T19:00:00.000Z",
  "cachedArticlesCount": 30
}
```

## How It Works

1. **News Fetching**: The application fetches articles from RSS feeds of major tech and business news sources (TechCrunch, Bloomberg, Reuters, The Verge, etc.).

2. **AI Curation**: DeepSeek API analyzes and ranks articles to select the 30 most relevant and important tech and business news items.

3. **Caching**: News articles are cached in memory to serve the web interface quickly.

4. **Scheduling**: A cron job runs every 12 hours to:
   - Fetch fresh news from RSS feeds
   - Curate articles using DeepSeek API
   - Update the cache
   - Send an email with the formatted news

5. **Email Formatting**: Emails are sent as HTML with:
   - Professional formatting
   - Article titles, descriptions, sources, and links
   - Images (when available)
   - Plain text fallback

## Customization

### Change Update Frequency

Edit `config.js` and modify the cron pattern:
```javascript
schedule: {
  interval: '0 */12 * * *' // Change to your desired interval
}
```

Cron format: `minute hour day month weekday`
- Every 12 hours: `0 */12 * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 9 AM: `0 9 * * *`

### Change Port

Edit `.env`:
```
PORT=3000
```

### Modify News Sources

Edit `services/newsService.js` to change search queries or add more categories.

## Troubleshooting

### Email Not Sending

1. Verify Gmail credentials in `.env`
2. Ensure 2-Step Verification is enabled
3. Use App Password (not regular password)
4. Check server logs for error messages

### News Not Loading

1. Verify DeepSeek API key is correct
2. Check RSS feeds are accessible (some may be blocked or rate-limited)
3. Check server logs for API errors
4. Ensure internet connection is active
5. DeepSeek API may have rate limits - check your API usage

### Server Won't Start

1. Verify all dependencies are installed: `npm install`
2. Check that `.env` file exists and is properly formatted
3. Ensure port 3000 is not already in use
4. Check Node.js version: `node --version` (should be v14+)

## Dependencies

- **express**: Web server framework
- **node-cron**: Scheduled task runner
- **nodemailer**: Email sending library
- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management
- **rss-parser**: RSS feed parser for fetching news articles

## License

ISC

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for error messages
3. Verify all configuration is correct

---

**Note**: This application is designed to run continuously. For production use, consider:
- Using a process manager (PM2)
- Setting up proper logging
- Using a database for news storage
- Implementing error monitoring
- Running on a VPS or cloud service
