const express = require('express');
const { ChatMessage, ChatConversation } = require('../models/Chat');
const { User } = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get or create conversation for current user
router.get('/conversation', protect, async (req, res) => {
  console.log('[CHAT] GET /conversation', { ip: req.ip, time: new Date().toISOString(), user: req.userId });
  const timeoutMs = 8000;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB operation timed out')), timeoutMs));
  try {
    const userId = req.userId;
    const user = await Promise.race([
      User.findById(userId),
      timeout
    ]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let conversation = await Promise.race([
      ChatConversation.findOne({ userId }),
      timeout
    ]);
    if (!conversation) {
      conversation = new ChatConversation({
        userId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        status: 'active',
      });
      await Promise.race([
        conversation.save(),
        timeout
      ]);
    }
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ success: false, message: 'Failed to get conversation', error: err.message });
  }
});

// Get messages for a conversation
router.get('/messages/:conversationId', protect, async (req, res) => {
  console.log('[CHAT] GET /messages/:conversationId', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
  const timeoutMs = 8000;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB operation timed out')), timeoutMs));
  try {
    const { conversationId } = req.params;
    const messages = await Promise.race([
      ChatMessage.find({ conversationId }).sort({ createdAt: 1 }),
      timeout
    ]);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages', error: err.message });
  }
});

// Send a message
router.post('/messages', protect, async (req, res) => {
  console.log('[CHAT] POST /messages', { ip: req.ip, time: new Date().toISOString(), user: req.userId, body: req.body });
  const timeoutMs = 8000;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB operation timed out')), timeoutMs));
  try {
    const { conversationId, message } = req.body;
    const userId = req.userId;
    const user = await Promise.race([
      User.findById(userId),
      timeout
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const newMessage = new ChatMessage({
      conversationId,
      userId,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      message,
      createdAt: new Date(),
      read: false,
    });
    await Promise.race([
      newMessage.save(),
      timeout
    ]);
    // Update conversation last message time
    await Promise.race([
      ChatConversation.findByIdAndUpdate(
        conversationId,
        { lastMessageTime: new Date() },
        { new: true }
      ),
      timeout
    ]);
    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Failed to send message', error: err.message });
  }
});
  }
});

// Mark messages as read
router.put('/messages/:conversationId/read', protect, async (req, res) => {
  console.log('[CHAT] PUT /messages/:conversationId/read', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
  try {
    const { conversationId } = req.params;

    await ChatMessage.updateMany(
      { conversationId, read: false },
      { read: true }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

module.exports = router;
