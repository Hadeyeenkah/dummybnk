// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Get notifications stream (Server-Sent Events)
router.get('/stream', protect, (req, res) => {
  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Don't set Access-Control-Allow-Origin here - let the main CORS middleware handle it

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ message: 'Connected to notification stream' })}\n\n`);

    // Keep connection open and send periodic updates
    const interval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(interval);
        return;
      }
      // Send a keep-alive comment
      res.write(`: keep-alive\n\n`);
    }, 30000); // Every 30 seconds

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    console.error('❌ Notifications stream error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to establish notification stream',
    });
  }
});

// Get all notifications for user
router.get('/', protect, (req, res) => {
  try {
    // Return empty array - can be extended to fetch from database
    res.json({
      status: 'success',
      notifications: [],
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notifications',
    });
  }
});

module.exports = router;
