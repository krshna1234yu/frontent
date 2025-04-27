const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Sample products data
const sampleProducts = [
  {
    title: "Pink Roses Bouquet",
    description: "Beautiful arrangement of fresh pink roses, perfect for anniversaries and birthdays.",
    price: 49.99,
    stock: 15,
    category: "Flowers",
    image: "/uploads/products/pink_roses.jpg",
    rating: 4.5,
    numRatings: 12
  },
  {
    title: "Luxury Chocolate Box",
    description: "Assorted premium chocolates in an elegant gift box. A perfect treat for chocolate lovers.",
    price: 29.99,
    stock: 25,
    category: "Chocolates",
    image: "/uploads/products/chocolate_box.jpg",
    rating: 4.8,
    numRatings: 20
  },
  {
    title: "Personalized Photo Frame",
    description: "Custom photo frame with engraved message. A heartfelt gift for all occasions.",
    price: 34.99,
    stock: 10,
    category: "Personalized",
    image: "/uploads/products/photo_frame.jpg",
    rating: 4.2,
    numRatings: 8
  },
  {
    title: "Scented Candle Set",
    description: "Set of 3 luxury scented candles with soothing fragrances. Creates a relaxing atmosphere.",
    price: 24.99,
    stock: 20,
    category: "Home",
    image: "/uploads/products/candle_set.jpg",
    rating: 4.0,
    numRatings: 15
  },
  {
    title: "Vintage Wine Bottle",
    description: "Premium vintage red wine from a renowned vineyard. Perfect for celebrations.",
    price: 59.99,
    stock: 8,
    category: "Wine",
    image: "/uploads/products/vintage_wine.jpg",
    rating: 4.7,
    numRatings: 10
  }
];

// Ensure uploads directory exists
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

// Create placeholder images for sample products
const createPlaceholderImages = () => {
  const productImages = [
    { name: "pink_roses.jpg", content: "Pink roses image placeholder" },
    { name: "chocolate_box.jpg", content: "Chocolate box image placeholder" },
    { name: "photo_frame.jpg", content: "Photo frame image placeholder" },
    { name: "candle_set.jpg", content: "Candle set image placeholder" },
    { name: "vintage_wine.jpg", content: "Vintage wine image placeholder" }
  ];

  productImages.forEach(img => {
    const imgPath = path.join(productsDir, img.name);
    if (!fs.existsSync(imgPath)) {
      fs.writeFileSync(imgPath, img.content, 'utf8');
      console.log(`Created placeholder image: ${imgPath}`);
    }
  });
};

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
    
    // Load Product model
    const Product = require('./models/Product');
    
    // Seed products
    console.log('Seeding products...');
    
    // Check if products already exist
    const existingCount = await Product.countDocuments();
    console.log(`Found ${existingCount} existing products`);
    
    if (existingCount > 0) {
      console.log('Database already has products. Skipping seed.');
      return;
    }
    
    // Insert sample products
    const result = await Product.insertMany(sampleProducts);
    console.log(`Seeded ${result.length} sample products`);
    
    console.log('Seed operation complete');
    process.exit(0);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

// Run the script
createPlaceholderImages();
connectDB(); 