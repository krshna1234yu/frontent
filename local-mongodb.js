/**
 * Local MongoDB Connection Script
 * 
 * This script provides a simplified version that bypasses MongoDB Atlas TLS issues
 * by using a local MongoDB server.
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Local MongoDB Connection
async function connectToLocalMongoDB() {
  try {
    const localMongoURI = 'mongodb://localhost:27017/gifther';
    console.log('Attempting to connect to local MongoDB at:', localMongoURI);
    
    await mongoose.connect(localMongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to local MongoDB successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to local MongoDB:', error.message);
    console.log('\nPlease make sure that:');
    console.log('1. MongoDB is installed locally on your machine');
    console.log('2. MongoDB service is running');
    console.log('3. You can start MongoDB using "mongod" command');
    console.log('\nAlternative solution:');
    console.log('1. Install MongoDB Compass');
    console.log('2. Connect to your Atlas cluster via MongoDB Compass');
    console.log('3. This will help set up the right TLS settings automatically');
    
    return false;
  }
}

// Basic routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Local MongoDB server is running',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  // Try to connect to MongoDB
  const isConnected = await connectToLocalMongoDB();
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`MongoDB connection status: ${isConnected ? 'Connected' : 'Failed'}`);
    
    if (isConnected) {
      console.log('\n✅ SUCCESS: Your local database is now working!');
      console.log('\nNext steps:');
      console.log('1. Modify your main app.js to prioritize local MongoDB connection');
      console.log('2. Update your .env file to use local MongoDB URI by default');
      console.log('3. Restart your main server');
    } else {
      console.log('\n⚠️ To fix MongoDB Atlas TLS issues:');
      console.log('1. Add TLS options to your connection string (tls=true&tlsInsecure=true)');
      console.log('2. Downgrade Node.js version if you\'re using v17+');
      console.log('3. Whitelist your IP address in MongoDB Atlas dashboard');
    }
  });
}

// Start everything
startServer(); 