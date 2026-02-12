const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with Gmail SMTP
   */
  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  /**
   * Format news articles into HTML email
   */
  formatNewsEmail(articles, fetchTime) {
    const dateStr = fetchTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    let articlesHtml = '';
    articles.forEach((article, index) => {
      const publishedDate = article.publishedAt 
        ? new Date(article.publishedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Date not available';

      articlesHtml += `
        <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
          <h3 style="margin-top: 0; margin-bottom: 10px; color: #1a73e8;">
            <a href="${article.url}" style="color: #1a73e8; text-decoration: none;">${article.title || 'No title'}</a>
          </h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            <strong>${article.source?.name || 'Unknown source'}</strong> • ${publishedDate}
          </p>
          ${article.urlToImage ? `
            <img src="${article.urlToImage}" alt="${article.title}" style="max-width: 100%; height: auto; margin: 15px 0; border-radius: 4px;" />
          ` : ''}
          <p style="margin: 10px 0; color: #333; line-height: 1.6;">
            ${article.description || 'No description available.'}
          </p>
          <a href="${article.url}" style="display: inline-block; margin-top: 10px; color: #1a73e8; text-decoration: none; font-weight: 500;">
            Read more →
          </a>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tech & Business News Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <header style="border-bottom: 3px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #1a73e8; font-size: 28px;">Tech & Business News Update</h1>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Your curated selection of the 30 most relevant tech and business news</p>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">Updated: ${dateStr}</p>
          </header>

          <main>
            ${articlesHtml}
          </main>

          <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated news digest. You are receiving this because you subscribed to tech and business news updates.</p>
            <p style="margin-top: 10px;">Total articles: ${articles.length}</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send news email
   */
  async sendNewsEmail(articles, fetchTime) {
    if (!config.email.user || !config.email.password || !config.email.recipient) {
      console.error('Email configuration is missing. Please check your .env file.');
      return false;
    }

    try {
      const htmlContent = this.formatNewsEmail(articles, fetchTime);

      const mailOptions = {
        from: `"Tech Business News" <${config.email.user}>`,
        to: config.email.recipient,
        subject: `Tech & Business News Update - ${articles.length} Articles`,
        html: htmlContent,
        text: this.generatePlainTextVersion(articles, fetchTime)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error.message);
      return false;
    }
  }

  /**
   * Generate plain text version of email
   */
  generatePlainTextVersion(articles, fetchTime) {
    const dateStr = fetchTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let text = `Tech & Business News Update\n`;
    text += `Updated: ${dateStr}\n\n`;
    text += `Your curated selection of the 30 most relevant tech and business news\n\n`;
    text += `${'='.repeat(60)}\n\n`;

    articles.forEach((article, index) => {
      const publishedDate = article.publishedAt 
        ? new Date(article.publishedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Date not available';

      text += `${index + 1}. ${article.title || 'No title'}\n`;
      text += `   Source: ${article.source?.name || 'Unknown'} | Date: ${publishedDate}\n`;
      text += `   ${article.description || 'No description available.'}\n`;
      text += `   Read more: ${article.url}\n\n`;
    });

    text += `${'='.repeat(60)}\n`;
    text += `Total articles: ${articles.length}\n`;

    return text;
  }
}

module.exports = new EmailService();
