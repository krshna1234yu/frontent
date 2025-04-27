/**
 * Script to test MongoDB Atlas connection
 * Usage: node scripts/testDbConnection.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('Connection string:', process.env.MONGO_URI);
    
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Test creating a collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => {
      console.log('- ' + collection.name);
    });
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('This is likely a network or authentication issue.');
      console.error('Check your MongoDB Atlas username, password, and network access settings.');
    }
    
    return false;
  }
};

testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test completed successfully.');
    } else {
      console.log('Database connection test failed.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 