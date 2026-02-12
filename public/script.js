// API endpoints
const API_BASE = '/api';
const NEWS_ENDPOINT = `${API_BASE}/news`;
const REFRESH_ENDPOINT = `${API_BASE}/refresh`;

// DOM elements
const newsContainer = document.getElementById('newsContainer');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdateSpan = document.getElementById('lastUpdate');

// Auto-refresh interval (30 minutes)
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000;
let autoRefreshTimer = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    setupRefreshButton();
    startAutoRefresh();
});

// Setup refresh button
function setupRefreshButton() {
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        
        try {
            showLoading();
            const response = await fetch(REFRESH_ENDPOINT);
            const data = await response.json();
            
            if (data.success) {
                displayNews(data.articles);
                updateLastFetchTime(data.fetchTime);
                showNotification(`Fetched ${data.count} articles. Email ${data.emailSent ? 'sent' : 'failed to send'}.`);
            } else {
                showError(data.error || 'Failed to refresh news');
            }
        } catch (error) {
            showError('Error refreshing news: ' + error.message);
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh News';
        }
    });
}

// Load news from API
async function loadNews() {
    try {
        showLoading();
        const response = await fetch(NEWS_ENDPOINT);
        const data = await response.json();
        
        if (data.success) {
            if (data.articles && data.articles.length > 0) {
                displayNews(data.articles);
                updateLastFetchTime(data.lastFetchTime);
            } else {
                showEmptyState();
            }
        } else {
            showError(data.error || 'Failed to load news');
        }
    } catch (error) {
        showError('Error loading news: ' + error.message);
    }
}

// Display news articles
function displayNews(articles) {
    hideAllStates();
    newsContainer.style.display = 'grid';
    newsContainer.innerHTML = '';
    
    articles.forEach((article, index) => {
        const card = createNewsCard(article, index);
        newsContainer.appendChild(card);
    });
}

// Create news card element
function createNewsCard(article, index) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    const publishedDate = article.publishedAt 
        ? formatDate(article.publishedAt)
        : 'Date not available';
    
    let imageHtml = '';
    if (article.urlToImage) {
        imageHtml = `<img src="${escapeHtml(article.urlToImage)}" alt="${escapeHtml(article.title || 'News image')}" class="news-card-image" onerror="this.style.display='none'">`;
    }
    
    card.innerHTML = `
        ${imageHtml}
        <div class="news-card-content">
            <div class="news-card-meta">
                <span class="news-card-source">${escapeHtml(article.source?.name || 'Unknown source')}</span>
                <span class="news-card-date">${publishedDate}</span>
            </div>
            <h2 class="news-card-title">
                <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(article.title || 'No title')}
                </a>
            </h2>
            <p class="news-card-description">
                ${escapeHtml(article.description || 'No description available.')}
            </p>
            <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="news-card-link">
                Read more
            </a>
        </div>
    `;
    
    return card;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// Update last fetch time display
function updateLastFetchTime(timeString) {
    if (!timeString) {
        lastUpdateSpan.textContent = 'Never updated';
        return;
    }
    
    const date = new Date(timeString);
    const formatted = formatDate(timeString);
    lastUpdateSpan.textContent = `Last updated: ${formatted}`;
    lastUpdateSpan.title = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show/hide states
function showLoading() {
    hideAllStates();
    loadingDiv.style.display = 'block';
}

function showError(message) {
    hideAllStates();
    errorDiv.style.display = 'block';
    errorMessage.textContent = message;
}

function showEmptyState() {
    hideAllStates();
    emptyState.style.display = 'block';
}

function hideAllStates() {
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    emptyState.style.display = 'none';
    newsContainer.style.display = 'none';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message) {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #34a853;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Clear existing timer
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    
    // Set up new timer
    autoRefreshTimer = setInterval(() => {
        console.log('Auto-refreshing news...');
        loadNews();
    }, AUTO_REFRESH_INTERVAL);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
