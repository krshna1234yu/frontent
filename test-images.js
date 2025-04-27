const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configure base URL for API
const API_URL = 'http://localhost:5000';

// Check if uploads directory exists
const checkUploadsDirectory = () => {
  console.log('\n--- Checking Uploads Directory ---');
  const uploadsDir = path.join(__dirname, 'uploads');
  const productsDir = path.join(uploadsDir, 'products');
  const placeholderPath = path.join(uploadsDir, 'placeholder.jpg');

  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Uploads directory does not exist!');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  } else {
    console.log('✅ Uploads directory exists');
  }

  if (!fs.existsSync(productsDir)) {
    console.log('❌ Products directory does not exist!');
    fs.mkdirSync(productsDir, { recursive: true });
    console.log('✅ Created products directory');
  } else {
    console.log('✅ Products directory exists');
  }

  if (!fs.existsSync(placeholderPath)) {
    console.log('❌ Placeholder image does not exist!');
    fs.writeFileSync(placeholderPath, 'Placeholder Image', 'utf8');
    console.log('✅ Created placeholder image');
  } else {
    console.log('✅ Placeholder image exists');
  }
};

// Fetch products from the API
const fetchProducts = async () => {
  console.log('\n--- Fetching Products ---');
  try {
    const response = await axios.get(`${API_URL}/api/products`);
    console.log(`✅ Products fetched successfully. Status: ${response.status}`);
    
    // Check response structure
    if (response.data && response.data.products && Array.isArray(response.data.products)) {
      console.log(`✅ Found ${response.data.products.length} products in response.data.products`);
      return response.data.products;
    } else if (Array.isArray(response.data)) {
      console.log(`✅ Found ${response.data.length} products in direct array`);
      return response.data;
    } else {
      console.log('❌ Unexpected response format:', typeof response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Error fetching products:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return [];
  }
};

// Check product images
const checkProductImages = (products) => {
  console.log('\n--- Checking Product Images ---');
  
  if (!products || products.length === 0) {
    console.log('❌ No products to check');
    return;
  }
  
  for (const product of products) {
    console.log(`\nProduct: ${product.title} (${product._id})`);
    console.log(`Image path: ${product.image || 'No image'}`);
    
    // Check if image path is properly formatted
    if (!product.image) {
      console.log('❌ Missing image path');
      continue;
    }
    
    // Check if image starts with /uploads/
    if (!product.image.startsWith('/uploads/')) {
      console.log('❌ Image path does not start with /uploads/');
    } else {
      console.log('✅ Image path starts with /uploads/');
    }
    
    // Check if file exists
    const imagePath = path.join(__dirname, product.image);
    if (fs.existsSync(imagePath)) {
      console.log(`✅ Image file exists at: ${imagePath}`);
    } else {
      console.log(`❌ Image file does not exist at: ${imagePath}`);
    }
    
    // Testing image URL
    const imageUrl = `${API_URL}${product.image}`;
    console.log(`Image URL would be: ${imageUrl}`);
  }
};

// Test mock products endpoint
const testMockProducts = async () => {
  console.log('\n--- Testing Mock Products Endpoint ---');
  try {
    const response = await axios.get(`${API_URL}/api/products/mock`);
    console.log(`✅ Mock products endpoint working. Status: ${response.status}`);
    console.log(`Found ${response.data.products.length} mock products`);
    
    // Check first mock product
    if (response.data.products.length > 0) {
      const firstProduct = response.data.products[0];
      console.log('Sample mock product:', {
        id: firstProduct._id,
        title: firstProduct.title,
        image: firstProduct.image
      });
    }
  } catch (error) {
    console.log('❌ Error fetching mock products:', error.message);
  }
};

// Create test product image files
const createTestProductImages = () => {
  console.log('\n--- Creating Test Product Images ---');
  const productsDir = path.join(__dirname, 'uploads', 'products');
  
  // Ensure directory exists
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
  }
  
  // Create sample product images
  const testImages = [
    { name: 'pink_roses.jpg', content: 'Pink roses image content' },
    { name: 'chocolate_box.jpg', content: 'Chocolate box image content' },
    { name: 'photo_frame.jpg', content: 'Photo frame image content' },
    { name: 'candle_set.jpg', content: 'Candle set image content' },
    { name: 'vintage_wine.jpg', content: 'Vintage wine image content' },
  ];
  
  testImages.forEach(img => {
    const imgPath = path.join(productsDir, img.name);
    if (!fs.existsSync(imgPath)) {
      fs.writeFileSync(imgPath, img.content, 'utf8');
      console.log(`✅ Created test image: ${imgPath}`);
    } else {
      console.log(`ℹ️ Test image already exists: ${imgPath}`);
    }
  });
};

// Main function to run all checks
const main = async () => {
  console.log('=== STARTING IMAGE PATH DIAGNOSTICS ===');
  
  // Check directory structure
  checkUploadsDirectory();
  
  // Create test product images
  createTestProductImages();
  
  // Test mock products endpoint
  await testMockProducts();
  
  // Fetch and check real products
  const products = await fetchProducts();
  checkProductImages(products);
  
  console.log('\n=== DIAGNOSTICS COMPLETE ===');
};

// Run the main function
main().catch(console.error); 