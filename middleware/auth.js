const jwt = require('jsonwebtoken');

/**
 * Authentication middleware - Development version with fallbacks
 * This version allows development access even with invalid tokens
 */
const protect = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.split(' ')[1];

    // Check if no token
    if (!token) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'No token, authorization denied' });
      } else {
        // For development: proceed anyway
        console.log('No token, but allowing access for development');
        req.user = { id: 'test-user-id', isAdmin: true };
        return next();
      }
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ message: 'Token is not valid' });
      } else {
        console.log('Invalid token, but allowing access for development');
        req.user = { id: 'test-user-id', isAdmin: true };
        next();
      }
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Server error' });
    } else {
      req.user = { id: 'test-user-id', isAdmin: true };
      next();
    }
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Admin access denied' });
  } else {
    // For development: proceed anyway
    console.log('Not admin, but allowing access for development');
    next();
  }
};

module.exports = { protect, admin }; 