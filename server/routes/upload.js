const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { adminProtect } = require('../middleware/auth');
const path = require('path');

// @desc    Upload event image
// @route   POST /api/upload/event-image
// @access  Private (Admin)
router.post('/event-image', adminProtect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Return the URL path to access the image
    const imageUrl = `/uploads/events/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        url: imageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof require('multer').MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum size is 5MB'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message
  });
});

module.exports = router;

