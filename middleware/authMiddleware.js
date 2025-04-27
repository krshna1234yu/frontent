const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes - requires authentication
const protect = async (req, res, next) => {
  try {
    console.log('Auth middleware: Processing request');
    
    // Get token from headers
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies');
    }
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    // Verify token
    try {
      // Make sure we have a JWT_SECRET set
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables');
        process.env.JWT_SECRET = 'gifther_eb276a9f8d3c45b1a98e27c4f1d5a683b9f5c718dc2e4671abc8e79f2bd3secret';
      }
      
      console.log('Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified for user ID:', decoded.id);
      
      // Get user from database to verify they still exist
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log(`User not found: ${decoded.id}`);
        return res.status(401).json({ message: 'User not found or account deactivated' });
      }
      
      // Check if user is active - skip this check for admin users
      if (user.status && user.status !== 'Active' && !user.isAdmin) {
        console.log(`User status is ${user.status}: ${user.email}`);
        return res.status(403).json({ message: `Your account is ${user.status.toLowerCase()}. Please contact support.` });
      }
      
      // For admin users with Pending status, automatically activate them
      if (user.isAdmin && user.status === 'Pending') {
        console.log(`Activating admin user: ${user.email}`);
        user.status = 'Active';
        await user.save();
      }
      
      // Make sure the isAdmin flag is correctly set
      if (decoded.isAdmin === true && !user.isAdmin) {
        // Sync the model with the token claim
        user.isAdmin = true;
        await user.save();
        console.log(`Updated isAdmin flag for user: ${user.email}`);
      }
      
      // Store the entire user object in req.user for maximum compatibility
      req.user = user;
      
      console.log('User authenticated:', req.user.email, 'isAdmin:', user.isAdmin);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error in authentication' });
  }
};

// Middleware to check if user is admin
const admin = (req, res, next) => {
  try {
    if (!req.user) {
      console.log('Admin check: No user in request');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Log the user data for debugging
    console.log('Admin check for user:', {
      id: req.user._id || req.user.id,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    });
    
    if (req.user.isAdmin) {
      console.log('Admin access granted for:', req.user.email);
      return next();
    } else {
      console.log('Admin access denied for:', req.user.email);
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'Server error in admin verification' });
  }
};

// Enhanced error handling for auth failures
const handleAuthError = (err, req, res, errorType = 'general') => {
  console.error(`Authentication error (${errorType}):`, err);
  
  // Map error types to appropriate responses
  const errorResponses = {
    'token': {
      status: 401,
      message: 'Invalid or expired token. Please login again.'
    },
    'credentials': {
      status: 401,
      message: 'Invalid credentials. Please check your email and password.'
    },
    'validation': {
      status: 400,
      message: 'Invalid authentication data provided.'
    },
    'user_not_found': {
      status: 404,
      message: 'User not found or account has been deleted.'
    },
    'permission': {
      status: 403,
      message: 'You do not have permission to access this resource.'
    },
    'general': {
      status: 500,
      message: 'Authentication error occurred. Please try again later.'
    }
  };
  
  // Get the appropriate error response or fallback to general
  const errorInfo = errorResponses[errorType] || errorResponses.general;
  
  // Add debug information in development
  let responseData = { 
    message: errorInfo.message,
    success: false
  };
  
  // Add debug information in development
  if (process.env.NODE_ENV !== 'production') {
    responseData.error = err.message;
    responseData.stack = err.stack;
    responseData.type = errorType;
  }
  
  return res.status(errorInfo.status).json(responseData);
};

module.exports = { protect, admin, handleAuthError }; 