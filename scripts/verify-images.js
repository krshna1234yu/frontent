/**
 * Script to verify and fix product images in the database
 * 
 * Usage: node scripts/verify-images.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Set up MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/gifther', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Define Product model schema
const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  images: [String],
  stock: Number,
  rating: Number,
  numRatings: Number
});

const Product = mongoose.model('Product', productSchema);

// Verify and fix images
const verifyImages = async () => {
  try {
    // Connect to database
    const conn = await connectDB();
    
    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products to verify`);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory: ${uploadsDir}`);
    }
    
    // Ensure placeholder image exists
    const placeholderPath = path.join(uploadsDir, 'placeholder.jpg');
    if (!fs.existsSync(placeholderPath)) {
      // Create a simple text file placeholder - this should be replaced with a real image
      fs.writeFileSync(
        placeholderPath, 
        "This is a placeholder for missing images. Replace with a real image file.",
        'utf8'
      );
      console.log(`Created placeholder file at: ${placeholderPath}`);
    }
    
    // Check each product's images
    let updatedCount = 0;
    
    for (let product of products) {
      let updated = false;
      
      // Check main image
      if (product.image) {
        const imagePath = path.join(__dirname, '..', product.image);
        if (!fs.existsSync(imagePath)) {
          console.log(`Image not found for product ${product._id}: ${product.image}`);
          product.image = '/uploads/placeholder.jpg';
          updated = true;
        }
      } else if (!product.image) {
        console.log(`No image for product ${product._id}`);
        product.image = '/uploads/placeholder.jpg';
        updated = true;
      }
      
      // Check images array
      if (product.images && Array.isArray(product.images)) {
        const validImages = [];
        let imagesChanged = false;
        
        for (let imgUrl of product.images) {
          if (!imgUrl) {
            imagesChanged = true;
            continue;
          }
          
          const imagePath = path.join(__dirname, '..', imgUrl);
          if (fs.existsSync(imagePath)) {
            validImages.push(imgUrl);
          } else {
            console.log(`Array image not found for product ${product._id}: ${imgUrl}`);
            imagesChanged = true;
          }
        }
        
        if (imagesChanged) {
          // Add at least one image
          if (validImages.length === 0 && product.image && product.image !== '/uploads/placeholder.jpg') {
            validImages.push(product.image);
          } else if (validImages.length === 0) {
            validImages.push('/uploads/placeholder.jpg');
          }
          
          product.images = validImages;
          updated = true;
        }
      } else if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        // Create images array if it doesn't exist
        if (product.image && product.image !== '/uploads/placeholder.jpg') {
          product.images = [product.image];
        } else {
          product.images = ['/uploads/placeholder.jpg'];
        }
        updated = true;
      }
      
      // Save product if updated
      if (updated) {
        await product.save();
        updatedCount++;
        console.log(`Updated product ${product._id}: ${product.title}`);
      }
    }
    
    console.log(`Verification complete. Updated ${updatedCount} out of ${products.length} products`);
    
    // Close database connection
    await conn.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error(`Error verifying images: ${error.message}`);
    process.exit(1);
  }
};

// Run the verification
verifyImages(); 