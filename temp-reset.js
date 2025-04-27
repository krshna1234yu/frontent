/**
 * Simple script to generate a bcrypt hash for a password
 */
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = "password123"; // Use a simple test password

  console.log("Generating hash for password:", password);
  
  // Use salt rounds of 10 (which is what the registration route uses)
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log("\nGenerated hash:", hash);
  console.log("\nThis hash can be used for testing login with the password:", password);
  
  // Verify the hash works
  const isValid = await bcrypt.compare(password, hash);
  console.log("\nVerification test:", isValid ? "PASS" : "FAIL");
}

generateHash().catch(console.error); 