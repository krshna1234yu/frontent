const axios = require('axios');

// Test user data
const testUser = {
  name: "Test User",
  email: "test" + Date.now() + "@example.com", // Unique email to avoid conflicts
  phone: "1234567890",
  address: "123 Test Street, Test City",
  password: "Test@123"
};

console.log(`Testing registration with email: ${testUser.email}`);

// Function to test registration
async function testRegistration() {
  try {
    console.log("Attempting to register user...");
    const response = await axios.post('http://localhost:5000/api/users/register', testUser);
    
    console.log("Registration successful!");
    console.log("Status:", response.status);
    console.log("Response data:", response.data);
    
    return true;
  } catch (error) {
    console.error("Registration failed!");
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Status:", error.response.status);
      console.error("Response data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);
    }
    
    return false;
  }
}

// Execute the test
testRegistration()
  .then(success => {
    if (success) {
      console.log("✅ Registration test completed successfully");
    } else {
      console.log("❌ Registration test failed");
    }
  })
  .catch(err => {
    console.error("Unexpected error during test:", err);
  }); 