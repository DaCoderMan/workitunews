/**
 * Middleware to check if user is authenticated
 * Redirects to login page if not authenticated
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated && req.session.userId) {
    return next();
  }
  
  // If it's an API request, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // Otherwise redirect to login
  res.redirect('/login');
}

/**
 * Middleware to check if user is already authenticated
 * Redirects to home if already logged in (for login page)
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.authenticated && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  requireAuth,
  requireGuest
};
