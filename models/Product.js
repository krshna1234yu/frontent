const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: {
    type: String,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  category: { 
    type: String, 
    required: true,
    trim: true
  },
  image: String,  // Main product image
  images: [String],  // Array of additional product images
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numRatings: {
    type: Number,
    default: 0,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating current price if there's a discount
productSchema.virtual('currentPrice').get(function() {
  if (this.discountPercentage && this.discountPercentage > 0) {
    return this.price * (1 - this.discountPercentage / 100);
  }
  return this.price;
});

// Ensure that we have at least one image in the images array
productSchema.pre('save', function(next) {
  if (!this.images) {
    this.images = [];
  }
  
  // If we have a main image but it's not in the images array
  if (this.image && !this.images.includes(this.image)) {
    this.images.unshift(this.image);
  }
  
  // If we have images but no main image
  if (this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  }
  
  next();
});

module.exports = mongoose.model("Product", productSchema);
