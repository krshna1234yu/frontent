const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/gifther")
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Get the Product collection
      const collection = mongoose.connection.collection('products');
      
      // Drop the problematic index
      await collection.dropIndex('sku_1');
      console.log('Successfully dropped sku_1 index');
    } catch (error) {
      console.error('Error dropping index:', error);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('Connection closed');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  }); 