// Apply patches before requiring Express
try {
  // Override the path-to-regexp handling in Express Router
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    const result = originalRequire.apply(this, arguments);
    
    // Patch Express Router when it's loaded
    if (id === 'express' || id === 'express/lib/router') {
      try {
        const Router = result.Router || result;
        
        if (Router && Router.prototype && Router.prototype.route) {
          const originalRoute = Router.prototype.route;
          
          // Override the route method to catch path-to-regexp errors
          Router.prototype.route = function(path) {
            try {
              // Check for problematic path patterns
              if (typeof path === 'string' && 
                  (path.includes('https://') || 
                   path.includes('http://') || 
                   path.includes('git.new'))) {
                console.error(`⚠️ Detected problematic route path: "${path}". Using safe fallback.`);
                // Use a path that won't match anything
                return originalRoute.call(this, '/___invalid_route___');
              }
              
              // Normal case
              return originalRoute.call(this, path);
            } catch (err) {
              console.error(`⚠️ Error in Router.route for path "${path}":`, err);
              // Return a route that won't match anything
              return originalRoute.call(this, '/___error_route___');
            }
          };
        }
      } catch (patchError) {
        console.error('Failed to patch Express Router:', patchError);
      }
    }
    
    return result;
  };
} catch (err) {
  console.error('Failed to install Express router patch:', err);
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config(); // Ensure dotenv is loaded at the very top to access environment variables
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { passport } = require('./config/passport');

// Increase memory allocation limit to prevent Array buffer allocation error
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

// Ensure placeholder image exists
const placeholderImagePath = path.join(uploadsDir, 'placeholder.jpg');
if (!fs.existsSync(placeholderImagePath)) {
  try {
    // Create a simple placeholder - in production, you'd have a better placeholder image
    // This is a simple approach that copies a basic placeholder from public directory if available
    const publicPlaceholderPath = path.join(__dirname, 'public', 'placeholder.jpg');
    if (fs.existsSync(publicPlaceholderPath)) {
      fs.copyFileSync(publicPlaceholderPath, placeholderImagePath);
      console.log(`Copied placeholder image to: ${placeholderImagePath}`);
    } else {
      // If no source placeholder exists, create a text file that explains the issue
      fs.writeFileSync(
        placeholderImagePath, 
        "This is a placeholder for missing images. Replace with a real image file.",
        'utf8'
      );
      console.log(`Created placeholder file at: ${placeholderImagePath}`);
    }
  } catch (err) {
    console.error("Error creating placeholder image:", err);
  }
}

// Also create product and profile directories
const productsDir = path.join(uploadsDir, 'products');
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
  console.log(`Created products upload directory: ${productsDir}`);
}

const profilesDir = path.join(uploadsDir, 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log(`Created profiles upload directory: ${profilesDir}`);
}

const app = express();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


// Static folder for uploaded images
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));
console.log(`Serving static files from: ${path.join(__dirname, 'uploads')}`);

// Serve placeholder image at a known URL for client fallback
app.get('/api/placeholder-image', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads', 'placeholder.jpg'));
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Check MongoDB connection status
    const dbStatus = global.isMongoConnected ? 'connected' : 'disconnected';
    
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        type: global.dbType || 'unknown',
        isConnecting: global.isConnecting || false,
        connectionAttempts: global.connectionAttempts || 0
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server health check failed',
      error: error.message
    });
  }
});

// Add specific MongoDB status check
app.get('/api/health/mongodb', (req, res) => {
  try {
    res.status(200).json({
      status: global.isMongoConnected ? 'connected' : 'disconnected',
      type: global.dbType || 'unknown',
      isConnecting: global.isConnecting || false,
      attempts: global.connectionAttempts || 0,
      lastError: global.lastError || null,
      timestamp: new Date().toISOString(),
      message: global.isMongoConnected 
        ? 'Database connection is healthy' 
        : (global.isConnecting 
           ? 'Attempting to connect to database' 
           : 'Database connection failed')
    });
  } catch (error) {
    console.error('MongoDB status check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check MongoDB status',
      error: error.message
    });
  }
});

// Add a direct route to attempt database reconnection
app.post('/api/admin/reconnect-db', async (req, res) => {
  try {
    // Only allow this in development or if there's an admin token
    const isAdmin = req.headers.authorization?.startsWith('Bearer ');
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!isAdmin && !isDevelopment) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to force database reconnection'
      });
    }
    
    // Cancel any existing reconnection interval
    if (global.reconnectInterval) {
      clearInterval(global.reconnectInterval);
      global.reconnectInterval = null;
    }
    
    // Reset connection state
    global.isConnecting = false;
    global.connectionAttempts = 0;
    
    console.log('Manually triggering database reconnection...');
    
    // Try to reconnect
    const result = await connectMongoDB();
    
    return res.status(200).json({
      success: true,
      connected: result,
      databaseStatus: {
        status: global.isMongoConnected ? 'connected' : 'disconnected',
        type: global.dbType || 'unknown',
        isConnecting: global.isConnecting
      },
      message: result 
        ? 'Successfully reconnected to database' 
        : 'Failed to reconnect, using fallback'
    });
  } catch (error) {
    console.error('Database reconnection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error attempting to reconnect to database',
      error: error.message
    });
  }
});

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'gifther_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection with better error handling and reconnection logic
const connectMongoDB = async () => {
  // Define connection options with industry-standard settings - remove unsupported options
  const connectionOptions = {
    serverSelectionTimeoutMS: 10000, // Reduced from 15s to 10s for faster fallback
    socketTimeoutMS: 45000, // 45 seconds for socket timeout
    connectTimeoutMS: 30000, // 30 seconds to establish connection
    maxPoolSize: 10, // Maximum 10 concurrent connections
    minPoolSize: 2, // Minimum 2 connections in pool
    retryWrites: true,
    retryReads: true,
    ssl: true, 
    tlsInsecure: true // For development only - helps bypass certain TLS issues
  };

  // For Atlas connection
  const mongoURI = process.env.MONGO_URI || 'mongodb+srv://ky905037:C17k7W9Q5eBQSyjZ@cluster0.qbhquha.mongodb.net/gifther?retryWrites=true&w=majority&tls=true&tlsInsecure=true';

  // Set global connection state
  global.isMongoConnected = false;
  global.isConnecting = true;
  global.connectionAttempts = 0;
  global.maxConnectionAttempts = 5;

  try {
    console.log('Connecting to MongoDB Atlas...');
    
    // Clear any existing listeners to prevent duplicates
    mongoose.connection.removeAllListeners();
    
    // Initialize connection state tracking
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB Atlas');
      global.isMongoConnected = true;
      global.isConnecting = false;
      global.connectionAttempts = 0; // Reset counter on successful connection
      global.lastError = null; // Clear any previous error
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err.message);
      global.isMongoConnected = false;
      global.lastError = {
        message: err.message,
        time: new Date().toISOString(),
        code: err.code || 'UNKNOWN'
      };
      
      // Check for authentication errors specifically
      if (err.message.includes('Authentication failed') || 
          err.message.includes('EAUTH') || 
          err.message.includes('credential') ||
          err.message.includes('password') ||
          (err.code && (err.code === 18 || err.code === 'EAUTH'))) {
        
        console.error(`
=====================================================================
🔴 MONGODB AUTHENTICATION ERROR DETECTED 🔴

Your MongoDB credentials appear to be invalid or expired.
Please check your connection string and make sure your username
and password are correct.

Error details: ${err.message}
=====================================================================
`);
        
        // Store specific error type for better client-side handling
        global.lastError.type = 'auth';
      }
      
      // Increment connection attempts
      global.connectionAttempts++;
      
      // If we've tried too many times, stop trying
      if (global.connectionAttempts > global.maxConnectionAttempts) {
        console.error(`Failed to connect after ${global.connectionAttempts} attempts. Giving up.`);
        global.isConnecting = false;
        
        // Set up memory fallback if we're not already in memory mode
        if (global.dbType !== 'memory') {
          setupMemoryFallback();
        }
      }
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
      global.isMongoConnected = false;
      
      // If not actively trying to connect, attempt to reconnect
      if (!global.isConnecting) {
        console.log('Attempting to reconnect...');
        setTimeout(() => {
          connectMongoDB();
        }, 5000); // Wait 5 seconds before trying to reconnect
      }
    });
    
    // Handle process termination gracefully
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    // Connect to MongoDB Atlas
    await mongoose.connect(mongoURI, connectionOptions);
    
    // Set up global flag for connection state
    global.isMongoConnected = true;
    global.isConnecting = false;
    global.dbType = 'atlas';
    
    console.log('✅ Connected to MongoDB Atlas successfully');
    return true;
  } catch (atlasErr) {
    console.error('❌ Could not connect to MongoDB Atlas:', atlasErr.message);
    global.isConnecting = false;
    
    // Check for IP whitelist issue
    if (atlasErr.message.includes('whitelist') || 
        atlasErr.message.includes('network') || 
        atlasErr.message.includes('connection timed out')) {
      console.error(`
=====================================================================
🔴 MONGODB ATLAS CONNECTION ERROR: IP WHITELIST ISSUE DETECTED 🔴

Your current IP address is not whitelisted in MongoDB Atlas.
Please add your current IP to your MongoDB Atlas IP Whitelist:
1. Log in to MongoDB Atlas at https://cloud.mongodb.com
2. Navigate to your cluster
3. Go to Network Access
4. Click "Add IP Address"
5. Add your current IP or use "Allow Access from Anywhere" (0.0.0.0/0)

If you're using a dynamic IP, you may need to update it regularly
or use Network Peering for a permanent solution.
=====================================================================
`);
    }
    
    // Try connecting to local MongoDB as fallback
    try {
      console.log('Trying local MongoDB as fallback...');
      const localMongoURI = "mongodb://localhost:27017/gifther";
      
      // Create a new connection options object without the unsupported options
      const localConnectionOptions = {
        serverSelectionTimeoutMS: 5000, // Faster timeout for local
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000, // Faster timeout for local
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true
      };
      
      await mongoose.connect(localMongoURI, localConnectionOptions);
      
      global.isMongoConnected = true;
      global.dbType = 'local';
      
      console.log('✅ Connected to local MongoDB as fallback');
      return true;
    } catch (localErr) {
      console.error('❌ MongoDB local connection error:', localErr.message);
      setupMemoryFallback();
      return false;
    }
  }
};

// Function to set up in-memory fallback storage
function setupMemoryFallback() {
  console.log(`
=====================================================================
🟠 OPERATING IN OFFLINE MODE 🟠

Unable to connect to MongoDB (either Atlas or local).
The application will use in-memory storage as a fallback.
Data will NOT be persisted between server restarts.

To fix this:
1. Check your internet connection
2. Verify MongoDB Atlas credentials in your .env file
3. Ensure your IP is whitelisted in MongoDB Atlas
4. Check if local MongoDB is running (if you want to use it)
=====================================================================
`);
  
  // Create an in-memory storage as fallback
  global.isMongoConnected = false;
  global.dbType = 'memory';
  global.mockStorage = {
    users: [],
    products: [],
    orders: [],
    messages: [],
    notifications: []
  };
  
  // Set up recurring attempts to reconnect to the database
  scheduleReconnection(60000); // Try every minute
}

// Function to schedule database reconnection with exponential backoff
function scheduleReconnection(delay = 5000) {
  // Clear any existing reconnection interval
  if (global.reconnectInterval) {
    clearInterval(global.reconnectInterval);
    global.reconnectInterval = null;
  }
  
  // Set up new reconnection interval
  global.reconnectInterval = setInterval(() => {
    if (!global.isMongoConnected && !global.isConnecting) {
      console.log(`Scheduled reconnection attempt (every ${delay/1000}s)...`);
      connectMongoDB().catch(err => {
        console.error('Reconnection attempt failed:', err.message);
        
        // Increase backoff for next attempt (max 5 minutes)
        const newDelay = Math.min(delay * 1.5, 300000);
        if (newDelay !== delay) {
          console.log(`Increasing reconnection delay to ${newDelay/1000} seconds`);
          scheduleReconnection(newDelay);
        }
      });
    } else if (global.isMongoConnected) {
      // If connected, clear the interval
      console.log('Successfully reconnected, clearing reconnection schedule');
      clearInterval(global.reconnectInterval);
      global.reconnectInterval = null;
    }
  }, delay);
  
  console.log(`Scheduled database reconnection attempts every ${delay/1000} seconds`);
}

// Initialize database connection with retry logic
(async function initializeDatabase() {
  try {
    await connectMongoDB();
  } catch (err) {
    console.error('Initial database connection failed:', err);
    setupMemoryFallback();
  }
})();

// Add a test route for connection debugging
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "API is working correctly",
    timestamp: new Date().toISOString()
  });
});

// Add a direct mock products endpoint for development/troubleshooting
app.get("/api/products/mock", (req, res) => {
  const mockProducts = [
    {
      _id: "mock1",
      title: "Pink Roses Bouquet",
      description: "Beautiful arrangement of fresh pink roses, perfect for anniversaries and birthdays.",
      price: 49.99,
      stock: 15,
      category: "Flowers",
      image: "/uploads/products/pink_roses.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: "mock2",
      title: "Luxury Chocolate Box",
      description: "Assorted premium chocolates in an elegant gift box. A perfect treat for chocolate lovers.",
      price: 29.99,
      stock: 25,
      category: "Chocolates",
      image: "/uploads/products/chocolate_box.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: "mock3",
      title: "Personalized Photo Frame",
      description: "Custom photo frame with engraved message. A heartfelt gift for all occasions.",
      price: 34.99,
      stock: 10,
      category: "Personalized",
      image: "/uploads/products/photo_frame.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  res.json({ 
    products: mockProducts,
    success: true,
    count: mockProducts.length,
    isMock: true
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to GiftHer API 🚀");
});

// Pre-load models to ensure consistent casing
try {
  // Import models directly to ensure they are registered correctly
  require('./models');
  console.log("✅ Models loaded successfully");
} catch (err) {
  console.error("❌ Error initializing models:", err);
}

// Import routes
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
// const messageRoutes = require("./routes/messageRoutes");

// Create a wrapper for route registration to handle errors
const safeUseRoute = (app, path, router) => {
  try {
    console.log(`📝 Registering ${path} routes...`);
    app.use(path, router);
    return true;
  } catch (error) {
    console.error(`❌ Error registering ${path} routes:`, error);
    
    // Create a fallback router that returns an error for all requests
    const fallbackRouter = express.Router();
    fallbackRouter.all('*', (req, res) => {
      res.status(500).json({
        error: `Route registration error for ${path}`,
        message: 'This route is currently unavailable due to a configuration error'
      });
    });
    
    app.use(path, fallbackRouter);
    return false;
  }
};

// Register routes using the safe wrapper
console.log("🔍 Registering application routes...");

safeUseRoute(app, '/api/users', userRoutes);
safeUseRoute(app, '/api/products', productRoutes);
safeUseRoute(app, '/api/auth', authRoutes);
safeUseRoute(app, '/api/orders', orderRoutes);
// safeUseRoute(app, '/api/messages', messageRoutes);
safeUseRoute(app, '/api/notifications', notificationRoutes);

console.log("✅ Route registration completed");

// Debug endpoint to check server status
app.get('/api/debug/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongo: {
      connected: !!global.isMongoConnected,
      type: global.dbType || 'unknown'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
    }
  });
});

// Handle 404 errors for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found', 
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  
  // Handle path-to-regexp errors specifically
  if (err && err.message && (
    err.message.includes('Missing parameter name') || 
    err.message.includes('pathToRegexpError') ||
    err.message.includes('expected END')
  )) {
    console.error('Path-to-regexp error detected:', err.message);
    return res.status(400).json({
      error: 'Invalid URL format',
      message: 'The server cannot process this URL format'
    });
  }
  
  // Don't send error stack in production
  const errorDetails = process.env.NODE_ENV === 'production' ? null : {
    stack: err.stack,
    name: err.name
  };
  
  res.status(500).json({ 
    message: "Internal server error", 
    error: process.env.NODE_ENV === 'production' ? null : err.message,
    details: errorDetails
  });
});

// Use process.on('uncaughtException') to prevent the server from crashing
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  // Keep the server running despite the error
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Add a route to switch to local MongoDB
app.post('/api/admin/use-local-db', async (req, res) => {
  try {
    // Only allow this in development or if there's an admin token
    const isAdmin = req.headers.authorization?.startsWith('Bearer ');
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!isAdmin && !isDevelopment) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to switch database connection'
      });
    }
    
    // If already connected to local MongoDB, just return success
    if (global.isMongoConnected && global.dbType === 'local') {
      return res.status(200).json({
        success: true,
        connected: true,
        databaseStatus: {
          status: 'connected',
          type: 'local',
          isConnecting: false
        },
        message: 'Already connected to local MongoDB'
      });
    }
    
    // Disconnect from Atlas if currently connected
    if (mongoose.connection.readyState !== 0) {
      console.log('Disconnecting from current MongoDB connection...');
      await mongoose.connection.close();
    }
    
    // Reset connection state
    global.isMongoConnected = false;
    global.isConnecting = true;
    global.connectionAttempts = 0;
    global.dbType = null;
    
    // Try connecting to local MongoDB
    console.log('Attempting to connect to local MongoDB...');
    try {
      const localMongoURI = "mongodb://localhost:27017/gifther";
      
      // Create a new connection options object for local connection - remove unsupported options
      const localConnectionOptions = {
        serverSelectionTimeoutMS: 5000, // Faster timeout for local
        socketTimeoutMS: 30000,
        connectTimeoutMS: 10000, // Faster timeout for local
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true
      };
      
      await mongoose.connect(localMongoURI, localConnectionOptions);
      
      global.isMongoConnected = true;
      global.isConnecting = false;
      global.dbType = 'local';
      
      console.log('✅ Connected to local MongoDB successfully');
      
      return res.status(200).json({
        success: true,
        connected: true,
        databaseStatus: {
          status: 'connected',
          type: 'local',
          isConnecting: false
        },
        message: 'Successfully connected to local MongoDB'
      });
    } catch (localErr) {
      console.error('❌ Failed to connect to local MongoDB:', localErr.message);
      
      // Set up memory fallback
      setupMemoryFallback();
      
      return res.status(200).json({
        success: true,
        connected: false,
        databaseStatus: {
          status: 'disconnected',
          type: 'memory',
          isConnecting: false,
          error: localErr.message
        },
        message: 'Failed to connect to local MongoDB, using memory fallback'
      });
    }
  } catch (error) {
    console.error('Error switching to local MongoDB:', error);
    return res.status(500).json({
      success: false,
      message: 'Error attempting to switch to local MongoDB',
      error: error.message
    });
  }
});

// Add this at the end of your server file
module.exports = app;
