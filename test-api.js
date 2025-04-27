const axios = require('axios');

console.log('Testing API endpoints...');

// Test the products endpoint
async function testProductsAPI() {
  try {
    console.log('Fetching products from API...');
    const response = await axios.get('http://localhost:5000/api/products');
    
    console.log('API Response Status:', response.status);
    console.log('Response Type:', typeof response.data);
    
    if (response.data && response.data.products && Array.isArray(response.data.products)) {
      console.log(`Found ${response.data.products.length} products`);
      
      if (response.data.products.length > 0) {
        const firstProduct = response.data.products[0];
        console.log('Sample product:', {
          id: firstProduct._id,
          title: firstProduct.title,
          image: firstProduct.image
        });
      } else {
        console.log('No products found in database');
      }
    } else if (Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} products (direct array)`);
      
      if (response.data.length > 0) {
        const firstProduct = response.data[0];
        console.log('Sample product:', {
          id: firstProduct._id,
          title: firstProduct.title,
          image: firstProduct.image
        });
      } else {
        console.log('No products found in database');
      }
    } else {
      console.log('Unexpected API response format:', response.data);
    }
  } catch (error) {
    console.error('API test failed:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  }
}

// Make sure the server is running before executing this test
setTimeout(() => {
  testProductsAPI();
}, 1000); 