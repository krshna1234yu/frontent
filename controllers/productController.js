// Import from the centralized models index to prevent casing issues
const { Product } = require("../models");
const path = require('path');
const fs = require('fs');
const { Order } = require("../models");

// Mock products for fallback
const mockProducts = [
  {
    _id: "mock1",
    title: "Pink Roses Bouquet",
    description: "Beautiful arrangement of fresh pink roses, perfect for anniversaries and birthdays.",
    price: 49.99,
    stock: 15,
    category: "Flowers",
    image: "uploads/pink_roses.jpg",
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
    image: "uploads/chocolate_box.jpg",
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
    image: "uploads/photo_frame.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "mock4",
    title: "Scented Candle Set",
    description: "Set of 3 luxury scented candles with soothing fragrances. Creates a relaxing atmosphere.",
    price: 24.99,
    stock: 20,
    category: "Home",
    image: "uploads/candle_set.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "mock5",
    title: "Vintage Wine Bottle",
    description: "Premium vintage red wine from a renowned vineyard. Perfect for celebrations.",
    price: 59.99,
    stock: 8,
    category: "Wine",
    image: "uploads/vintage_wine.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper to ensure proper image path format
const formatImagePath = (imagePath) => {
  if (!imagePath) return '/uploads/placeholder.jpg';
  
  // Already has proper format
  if (imagePath.startsWith('/uploads/')) {
    return imagePath;
  }
  
  // Add /uploads/ prefix if needed
  if (imagePath.startsWith('/')) {
    return `/uploads${imagePath}`;
  }
  
  // Add full path
  return `/uploads/${imagePath}`;
}

// Debug endpoint to get mock products - useful for testing when MongoDB connection fails
exports.getMockProducts = (req, res) => {
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
    },
    {
      _id: "mock4",
      title: "Scented Candle Set",
      description: "Set of 3 luxury scented candles with soothing fragrances. Creates a relaxing atmosphere.",
      price: 24.99,
      stock: 20,
      category: "Home",
      image: "/uploads/products/candle_set.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: "mock5",
      title: "Vintage Wine Bottle",
      description: "Premium vintage red wine from a renowned vineyard. Perfect for celebrations.",
      price: 59.99,
      stock: 8,
      category: "Wine",
      image: "/uploads/products/vintage_wine.jpg",
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
};

// CREATE
exports.createProduct = async (req, res) => {
  try {
    // Create product from request body with image path
    // Ensure sku is not part of the request to avoid the duplicate key error
    const { sku, ...productData } = req.body;
    
    // Format image path if provided
    if (productData.image) {
      productData.image = formatImagePath(productData.image);
    }
    
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (err) {
    console.error("Product creation error:", err);
    
    // Handle MongoDB errors with appropriate responses
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(400).json({ 
        message: "A product with this identifier already exists",
        error: "Duplicate key error"
      });
    }
    
    res.status(400).json({ message: "Failed to create product", error: err.message });
  }
};

// READ ALL
exports.getAllProducts = async (req, res) => {
  try {
    console.log('getAllProducts: Fetching all products');
    const products = await Product.find().sort({ createdAt: -1 });
    console.log(`getAllProducts: Found ${products.length} products`);
    
    // If no products found, return mock products in development
    if (products.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('No products found. Returning mock products for development.');
      return exports.getMockProducts(req, res);
    }
    
    // Log the first product to debug
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('Sample product:', {
        id: firstProduct._id,
        title: firstProduct.title,
        image: firstProduct.image
      });
    }
    
    // Ensure all product images have proper paths
    const formattedProducts = products.map(p => {
      const product = p.toObject();
      product.image = formatImagePath(product.image);
      return product;
    });
    
    // Send consistent response format
    res.json({ 
      products: formattedProducts,
      success: true,
      count: products.length
    });
  } catch (err) {
    console.error("Failed to fetch products from database:", err);
    
    // For development mode, return mock data on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Error getting products. Returning mock products for development.');
      return exports.getMockProducts(req, res);
    }
    
    // Send error response in consistent format
    res.status(500).json({ 
      message: "Failed to fetch products", 
      error: err.message,
      products: [] 
    });
  }
};

// READ ONE
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Format the product image path
    const formattedProduct = product.toObject();
    formattedProduct.image = formatImagePath(formattedProduct.image);
    
    res.json(formattedProduct);
  } catch (err) {
    console.error("Failed to fetch product:", err);
    res.status(404).json({ message: "Product not found", error: err.message });
  }
};

// UPDATE
exports.updateProduct = async (req, res) => {
  try {
    // Format image path if provided
    if (req.body.image) {
      req.body.image = formatImagePath(req.body.image);
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: "Failed to update product" });
  }
};

// DELETE
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete product" });
  }
};

// Add a new function to handle product ratings
exports.rateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    console.log('Rating request received:', {
      productId: id,
      rating,
      comment: comment || 'No comment provided',
      userId: req.user?._id || req.user?.id,
      body: req.body
    });
    
    if (!rating && rating !== 0) {
      return res.status(400).json({ message: 'Rating value is required' });
    }
    
    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
      return res.status(400).json({ message: 'Invalid rating value. Must be between 0 and 5.' });
    }
    
    // Make sure we have a valid user
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({ message: 'Authentication required to rate products' });
    }
    
    const userId = req.user._id || req.user.id;
    
    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    try {
      // Check if user has purchased this product
      console.log('Checking if user has purchased product');
      
      // Make the Order model available in this context
      const Order = require('../models/Order');
      
      // Look for any delivered orders containing this product
      const orders = await Order.find({
        'user': userId,
        'status': 'Delivered',
        'items.product': id
      });
      
      console.log(`Found ${orders.length} orders from user ${userId} containing product ${id}`);
      
      // Temporarily disable purchase check in development
      if (orders.length === 0 && process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ 
          message: 'You can only rate products you have purchased and received'
        });
      }
    } catch (orderErr) {
      console.error('Error checking orders:', orderErr);
      // Continue even if order check fails - don't block ratings due to order check issues
    }
    
    // Store the rating in a separate collection if you have one for ratings
    // For simplicity, we'll just update the product's average rating and count
    
    // Calculate new average rating
    const currentNumRatings = product.numRatings || 0;
    const currentRating = product.rating || 0;
    
    const newNumRatings = currentNumRatings + 1;
    const newRating = ((currentRating * currentNumRatings) + ratingValue) / newNumRatings;
    
    // Update the product
    product.rating = parseFloat(newRating.toFixed(1));
    product.numRatings = newNumRatings;
    
    // Add this review to product reviews array if it exists
    if (!product.reviews) {
      product.reviews = [];
    }
    
    // Add the new review
    product.reviews.push({
      userId: userId,
      rating: ratingValue,
      comment: comment || '',
      date: new Date()
    });
    
    await product.save();
    
    console.log('Product rating updated successfully', {
      productId: id,
      newRating: product.rating,
      numRatings: product.numRatings,
      hasComment: !!comment
    });
    
    return res.status(200).json({ 
      message: 'Rating submitted successfully',
      newRating: product.rating,
      numRatings: product.numRatings
    });
    
  } catch (error) {
    console.error('Error submitting product rating:', error);
    return res.status(500).json({ message: 'Failed to submit rating: ' + error.message });
  }
};
