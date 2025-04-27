const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google Strategy if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in our database
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // If user exists, update Google ID if not already set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // Create new user if doesn't exist
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            // Set a default for required fields
            password: `google_${profile.id}_${Date.now()}`, // This won't be used for login
            profilePic: profile.photos[0].value,
            phone: '0000000000', // Default placeholder
            address: 'Please update your address', // Default placeholder
            authProvider: 'google'
          });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.warn('Google OAuth strategy not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Configure Facebook Strategy if credentials are available
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'displayName', 'photos', 'email'],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Facebook sometimes doesn't provide email, handle that case
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
        
        // Check if user already exists in our database
        let user = await User.findOne({ email: email });
        
        if (user) {
          // If user exists, update Facebook ID if not already set
          if (!user.facebookId) {
            user.facebookId = profile.id;
            await user.save();
          }
        } else {
          // Create new user if doesn't exist
          user = await User.create({
            facebookId: profile.id,
            name: profile.displayName,
            email: email,
            // Set a default for required fields
            password: `facebook_${profile.id}_${Date.now()}`, // This won't be used for login
            profilePic: profile.photos[0] ? profile.photos[0].value : '',
            phone: '0000000000', // Default placeholder
            address: 'Please update your address', // Default placeholder
            authProvider: 'facebook'
          });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.warn('Facebook OAuth strategy not configured: Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { passport, generateToken }; 