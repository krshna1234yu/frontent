const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  console.log('Testing MongoDB connection...');
  
  // MongoDB Connection options with TLS fix
  const connectionOptions = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000, 
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    retryReads: true,
    ssl: true,
    tlsInsecure: true, // Important for bypassing TLS issues
    useNewUrlParser: true,
    useUnifiedTopology: true
  };

  // Use the MongoDB URI with TLS options
  const mongoURI = process.env.MONGO_URI || 'mongodb+srv://ky905037:C17k7W9Q5eBQSyjZ@cluster0.qbhquha.mongodb.net/gifther?retryWrites=true&w=majority&tls=true&tlsInsecure=true';
  
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`URI: ${mongoURI.replace(/:[^:]*@/, ':****@')}`); // Hide password in logs
    
    await mongoose.connect(mongoURI, connectionOptions);
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Try a simple query to verify connection is working
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Available collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed.');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error(error);
    
    // Provide more specific error handling for common issues
    if (error.name === 'MongoServerSelectionError') {
      console.log('\nThis error often indicates network connectivity issues or incorrect credentials.');
      console.log('Suggestions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your MongoDB Atlas username and password');
      console.log('3. Make sure your IP address is whitelisted in MongoDB Atlas');
    }
    
    if (error.message && error.message.includes('TLS')) {
      console.log('\nTLS/SSL Error detected!');
      console.log('Suggestions:');
      console.log('1. Try downgrading Node.js to a version below 17 if you are using a newer version');
      console.log('2. Set tlsInsecure=true in your connection string');
      console.log('3. Check if your network is blocking TLS connections');
    }
    
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMongoConnection()
    .then(success => {
      if (success) {
        console.log('MongoDB test completed successfully.');
      } else {
        console.log('MongoDB test failed. See errors above.');
      }
      process.exit(success ? 0 : 1);
    });
}

module.exports = testMongoConnection; 