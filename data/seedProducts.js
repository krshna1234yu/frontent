const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const sampleProducts = [
  {
    title: "Pink Roses Bouquet",
    description: "Beautiful arrangement of fresh pink roses, perfect for anniversaries and birthdays.",
    price: 49.99,
    stock: 15,
    category: "Flowers",
    image: "uploads/pink_roses.jpg"
  },
  {
    title: "Luxury Chocolate Box",
    description: "Assorted premium chocolates in an elegant gift box. A perfect treat for chocolate lovers.",
    price: 29.99,
    stock: 25,
    category: "Chocolates",
    image: "uploads/chocolate_box.jpg"
  },
  {
    title: "Personalized Photo Frame",
    description: "Custom photo frame with engraved message. A heartfelt gift for all occasions.",
    price: 34.99,
    stock: 10,
    category: "Personalized",
    image: "uploads/photo_frame.jpg"
  },
  {
    title: "Scented Candle Set",
    description: "Set of 3 luxury scented candles with soothing fragrances. Creates a relaxing atmosphere.",
    price: 24.99,
    stock: 20,
    category: "Home",
    image: "uploads/candle_set.jpg"
  },
  {
    title: "Vintage Wine Bottle",
    description: "Premium vintage red wine from a renowned vineyard. Perfect for celebrations.",
    price: 59.99,
    stock: 8,
    category: "Wine",
    image: "uploads/vintage_wine.jpg"
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/gifther");
    console.log('Connected to MongoDB');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');
    
    // Insert sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Seeded ${createdProducts.length} products`);
    
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts(); 