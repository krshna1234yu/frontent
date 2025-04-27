const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different types of uploads
const profilesDir = path.join(uploadsDir, "profiles");
const productsDir = path.join(uploadsDir, "products");

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `profile-${req.params.userId || 'user'}-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for product images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  // Check mime type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, and .gif are allowed.'), false);
  }
  
  cb(null, true);
};

// Configure multer for different upload types
const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

const productUpload = multer({
  storage: productStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for product images
  },
  fileFilter: imageFileFilter
});

// Generic uploader (for backward compatibility)
const genericStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique file
  }
});

const genericUpload = multer({
  storage: genericStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum file size is 5MB.'
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      message: `Error during file upload: ${err.message}`
    });
  }
  // No error occurred, so continue
  next();
};

module.exports = {
  upload: genericUpload,
  profileUpload,
  productUpload,
  handleMulterError
};
