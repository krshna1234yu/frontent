const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
try {
  // Check if Firebase already initialized to prevent multiple initializations
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK...');
    
    // In production, use service account credentials from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('Using Firebase service account from environment variable');
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        console.log('✅ Firebase Admin SDK initialized with service account');
      } catch (parseError) {
        console.error('❌ Failed to parse Firebase service account JSON:', parseError);
        console.error('Please check that your FIREBASE_SERVICE_ACCOUNT environment variable contains valid JSON');
        
        // Fallback to app default credentials
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
        console.log('⚠️ Falling back to application default credentials');
      }
    } else {
      // In development, initialize with application default credentials
      console.log('No Firebase service account found in environment variables');
      admin.initializeApp({
        // This works locally with Firebase application default credentials
        // or when deployed to Firebase hosting, GCP, etc.
        credential: admin.credential.applicationDefault(),
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'gifther-d05be'
      });
      
      console.log('✅ Firebase Admin SDK initialized with default credentials');
    }
    
    // Verify initialization
    try {
      const app = admin.app();
      console.log(`Firebase app initialized: ${app.name}, Project ID: ${app.options.projectId || 'unknown'}`);
    } catch (verifyError) {
      console.error('❌ Failed to verify Firebase initialization:', verifyError);
    }
  } else {
    console.log('Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
}

module.exports = admin; 