const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://ky905037:C17k7W9Q5eBQSyjZ@cluster0.qbhquha.mongodb.net/gifther?retryWrites=true&w=majority&tls=true&tlsInsecure=true';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      tlsInsecure: true
    });
    
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Load Product model
const Product = require('./models/Product');

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const productsDir = path.join(uploadsDir, 'products');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
  }
  
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
    console.log(`Created products directory: ${productsDir}`);
  }
  
  // Create a placeholder image if it doesn't exist
  const placeholderPath = path.join(uploadsDir, 'placeholder.jpg');
  if (!fs.existsSync(placeholderPath)) {
    // Create a simple text file for placeholder
    fs.writeFileSync(placeholderPath, 'Placeholder Image', 'utf8');
    console.log(`Created placeholder file at: ${placeholderPath}`);
  }
};

// Fix product image paths
const fixProductImages = async () => {
  try {
    const products = await Product.find({});
    console.log(`Found ${products.length} products in database`);
    
    let updatedCount = 0;
    
    for (let product of products) {
      let updated = false;
      
      // Fix image path if exists
      if (product.image) {
        // Ensure image path starts with a slash
        if (!product.image.startsWith('/')) {
          product.image = '/' + product.image;
          updated = true;
        }
        
        // Fix double slashes in path
        if (product.image.includes('//')) {
          product.image = product.image.replace(/\/\//g, '/');
          updated = true;
        }
        
        // If there's no uploads in the path, prepend it
        if (!product.image.includes('/uploads/')) {
          if (product.image.startsWith('/')) {
            product.image = '/uploads' + product.image;
          } else {
            product.image = '/uploads/' + product.image;
          }
          updated = true;
        }
      } else {
        // Set default placeholder image
        product.image = '/uploads/placeholder.jpg';
        updated = true;
      }
      
      // Update the product if changes were made
      if (updated) {
        await product.save();
        updatedCount++;
        console.log(`Updated product ${product._id}: ${product.title} => ${product.image}`);
      }
    }
    
    console.log(`Updated ${updatedCount} out of ${products.length} products`);
  } catch (err) {
    console.error('Error fixing product images:', err);
  }
};

// Main function
const main = async () => {
  await connectDB();
  ensureUploadsDir();
  await fixProductImages();
  console.log('Image fix operation complete');
  process.exit(0);
};

// Run the script
main(); 