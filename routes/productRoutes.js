const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMockProducts,
  rateProduct
} = require("../controllers/productController");
const { productUpload, handleMulterError } = require("../middleware/upload");
const fs = require("fs");
const path = require("path");
// Import from the centralized models index to prevent casing issues
const { Product } = require("../models");
const { protect } = require("../middleware/authMiddleware");

// CRUD Routes with file upload support
router.post("/", 
  productUpload.single("image"), 
  handleMulterError,
  async (req, res) => {
  try {
    // Add image path to req.body if an image was uploaded
    if (req.file) {
        req.body.image = `/uploads/products/${req.file.filename}`;
    }
    
    // Pass control to the product controller
    return createProduct(req, res);
  } catch (err) {
    console.error("Error in product upload:", err);
      // Clean up the uploaded file if there was an error
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      res.status(500).json({ message: "Failed to upload product", error: err.message });
    }
  }
);

// Update product with image upload support
router.put("/:id", 
  productUpload.single("image"), 
  handleMulterError,
  async (req, res) => {
    try {
      // Add image path to req.body if a new image was uploaded
      if (req.file) {
        // Get the current product to check for existing image
        const productId = req.params.id;
        const existingProduct = await getProductById({ params: { id: productId } }, { json: () => {} });
        
        // Delete the old image if it exists
        if (existingProduct && existingProduct.image && existingProduct.image.startsWith('/uploads/')) {
          const oldImagePath = path.join(__dirname, '..', existingProduct.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlink(oldImagePath, (err) => {
              if (err) console.error("Error deleting old product image:", err);
            });
          }
        }
        
        // Set the new image path
        req.body.image = `/uploads/products/${req.file.filename}`;
      }
      
      // Pass control to the update controller
      return updateProduct(req, res);
    } catch (err) {
      console.error("Error in product update:", err);
      
      // Clean up the uploaded file if there was an error
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      
      res.status(500).json({ message: "Failed to update product", error: err.message });
    }
  }
);

// Add a mock products endpoint for development
router.get("/mock", (req, res) => {
  console.log('Serving mock products for development/testing');
  return getMockProducts(req, res);
});

// Standard routes without file upload
router.get("/", getAllProducts);

router.get("/:id", getProductById);
router.delete("/:id", deleteProduct);

// Add this endpoint after the existing routes
// Verify and fix product images
router.post("/verify-images", async (req, res) => {
  try {
    // Get all products
    const products = await Product.find({});
    const updatedProducts = [];
    
    // Check each product's image
    for (let product of products) {
      let updated = false;
      
      // Check main image
      if (product.image) {
        const imagePath = path.join(__dirname, '..', product.image);
        if (!fs.existsSync(imagePath)) {
          // Image doesn't exist, use a placeholder
          product.image = '/uploads/placeholder.jpg';
          updated = true;
          
          // Create a placeholder image if it doesn't exist
          const placeholderDir = path.join(__dirname, '..', 'uploads');
          const placeholderPath = path.join(placeholderDir, 'placeholder.jpg');
          if (!fs.existsSync(placeholderPath)) {
            // Create a simple placeholder or copy from a default location
            // This is simplified - in production, you'd have a better placeholder strategy
            console.log("Creating placeholder image");
          }
        }
      }
      
      // Check image array if it exists
      if (product.images && Array.isArray(product.images)) {
        const validImages = [];
        let imagesChanged = false;
        
        for (let imgUrl of product.images) {
          const imagePath = path.join(__dirname, '..', imgUrl);
          if (fs.existsSync(imagePath)) {
            validImages.push(imgUrl);
          } else {
            imagesChanged = true;
          }
        }
        
        if (imagesChanged) {
          // If all images were invalid, add a placeholder
          if (validImages.length === 0) {
            validImages.push('/uploads/placeholder.jpg');
          }
          
          product.images = validImages;
          updated = true;
        }
      }
      
      // If product was updated, save it
      if (updated) {
        await product.save();
        updatedProducts.push(product._id);
      }
    }
    
    res.json({
      message: `Verified ${products.length} products, updated ${updatedProducts.length}`,
      updatedProducts
    });
  } catch (err) {
    console.error("Error verifying product images:", err);
    res.status(500).json({ message: "Failed to verify images", error: err.message });
  }
});

// Add a new route for product ratings
router.post('/:id/rate', protect, rateProduct);

module.exports = router;
