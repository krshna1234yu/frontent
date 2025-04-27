const http = require('http');

// Define the URL to test
const apiUrl = 'http://localhost:5000/api/products';

console.log(`Testing API endpoint: ${apiUrl}`);

// Make a GET request to the API endpoint
http.get(apiUrl, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  // Accumulate the response data
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Process the complete response
  res.on('end', () => {
    console.log('RESPONSE RECEIVED');
    try {
      const parsedData = JSON.parse(data);
      console.log('Response is valid JSON');
      
      if (parsedData.products && Array.isArray(parsedData.products)) {
        console.log(`Found ${parsedData.products.length} products in the response`);
        if (parsedData.products.length > 0) {
          console.log('First product:', {
            id: parsedData.products[0]._id,
            title: parsedData.products[0].title,
            image: parsedData.products[0].image
          });
        }
      } else {
        console.log('No products array found in the response');
        console.log('Response structure:', Object.keys(parsedData));
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
}); 