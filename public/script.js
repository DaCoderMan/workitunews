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
    setupLogoutButton();
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
            
            // Handle authentication errors
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            
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

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // Confirm logout
            if (!confirm('Are you sure you want to logout?')) {
                return;
            }
            
            try {
                const response = await fetch('/api/logout');
                const data = await response.json();
                
                if (data.success) {
                    // Clear any cached data
                    localStorage.clear();
                    sessionStorage.clear();
                    // Redirect to login
                    window.location.href = '/login';
                } else {
                    showNotification('Error logging out. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Redirect anyway
                window.location.href = '/login';
            }
        });
    }
}

// Load news from API
async function loadNews() {
    try {
        showLoading();
        const response = await fetch(NEWS_ENDPOINT);
        
        // Handle authentication errors
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
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

// Track currently expanded article
let expandedArticleId = null;

// Truncate text to specified length
function truncateText(text, maxLength = 150) {
    if (!text) return '';
    // Strip HTML tags if present
    const textContent = text.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) return textContent;
    // Try to truncate at word boundary
    const truncated = textContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace).trim() + '...';
    }
    return truncated.trim() + '...';
}

// Display news articles
function displayNews(articles) {
    hideAllStates();
    newsContainer.style.display = 'grid';
    newsContainer.innerHTML = '';
    expandedArticleId = null; // Reset expanded article
    
    articles.forEach((article, index) => {
        const card = createNewsCard(article, index);
        newsContainer.appendChild(card);
    });
}

// Create news card element
function createNewsCard(article, index) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.dataset.articleId = `article-${index}`;
    
    const publishedDate = article.publishedAt 
        ? formatDate(article.publishedAt)
        : 'Date not available';
    
    const fullDescription = article.description || 'No description available.';
    const truncatedDescription = truncateText(fullDescription, 150);
    
    // Thumbnail image (shown in collapsed state)
    let thumbnailHtml = '';
    if (article.urlToImage) {
        thumbnailHtml = `
            <div class="news-card-thumbnail-container">
                <img src="${escapeHtml(article.urlToImage)}" 
                     alt="${escapeHtml(article.title || 'News image')}" 
                     class="news-card-thumbnail" 
                     onerror="this.style.display='none'; this.parentElement.style.display='none';">
            </div>
        `;
    }
    
    // Full image (shown in expanded state)
    let fullImageHtml = '';
    if (article.urlToImage) {
        fullImageHtml = `
            <div class="news-card-image-container">
                <img src="${escapeHtml(article.urlToImage)}" 
                     alt="${escapeHtml(article.title || 'News image')}" 
                     class="news-card-image-full" 
                     onerror="this.style.display='none'; this.parentElement.style.display='none';">
            </div>
        `;
    }
    
    card.innerHTML = `
        ${thumbnailHtml}
        <div class="news-card-content">
            <div class="news-card-meta">
                <span class="news-card-source">${escapeHtml(article.source?.name || 'Unknown source')}</span>
                <span class="news-card-date">${publishedDate}</span>
            </div>
            <h2 class="news-card-title clickable-title" data-article-id="article-${index}">
                ${escapeHtml(article.title || 'No title')}
                <span class="expand-icon">▼</span>
            </h2>
            <div class="news-card-expanded" id="article-${index}">
                ${fullImageHtml}
                <p class="news-card-description">
                    ${escapeHtml(truncatedDescription)}
                </p>
                <div class="news-card-link-container">
                    <button class="news-card-link-btn" onclick="event.stopPropagation(); copyArticleUrl('${escapeHtml(article.url)}', this)">
                        Copy Article URL
                    </button>
                    <span class="news-card-url" style="display: none;">${escapeHtml(article.url)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add click handler to title
    const titleElement = card.querySelector('.clickable-title');
    titleElement.addEventListener('click', () => toggleArticle(index));
    
    return card;
}

// Toggle article expansion
function toggleArticle(index) {
    const articleId = `article-${index}`;
    const expandedContent = document.getElementById(articleId);
    const card = expandedContent.closest('.news-card');
    const titleElement = card.querySelector('.clickable-title');
    const expandIcon = titleElement.querySelector('.expand-icon');
    
    // If clicking the same article, toggle it
    if (expandedArticleId === articleId) {
        // Close it
        expandedContent.style.display = 'none';
        card.classList.remove('expanded');
        expandIcon.textContent = '▼';
        expandIcon.style.transform = 'rotate(0deg)';
        expandedArticleId = null;
    } else {
        // Close previously expanded article
        if (expandedArticleId) {
            const prevExpanded = document.getElementById(expandedArticleId);
            if (prevExpanded) {
                prevExpanded.style.display = 'none';
                const prevCard = prevExpanded.closest('.news-card');
                if (prevCard) {
                    prevCard.classList.remove('expanded');
                    const prevTitle = prevCard.querySelector('.clickable-title');
                    if (prevTitle) {
                        const prevIcon = prevTitle.querySelector('.expand-icon');
                        if (prevIcon) {
                            prevIcon.textContent = '▼';
                            prevIcon.style.transform = 'rotate(0deg)';
                        }
                    }
                }
            }
        }
        
        // Open new article
        expandedContent.style.display = 'block';
        card.classList.add('expanded');
        expandIcon.textContent = '▲';
        expandIcon.style.transform = 'rotate(0deg)';
        expandedArticleId = articleId;
    }
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

// Copy article URL to clipboard
function copyArticleUrl(url, buttonElement) {
    navigator.clipboard.writeText(url).then(() => {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Copied!';
        buttonElement.style.backgroundColor = '#34a853';
        
        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.style.backgroundColor = '';
        }, 2000);
        
        showNotification('Article URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy URL:', err);
        showNotification('Failed to copy URL. Please try again.');
    });
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
