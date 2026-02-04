const express = require('express');
const { ChatMessage, ChatConversation } = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('DB operation timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// Get or create conversation for current user
router.get('/conversation', protect, async (req, res) => {
  console.log('[CHAT] GET /conversation', { ip: req.ip, time: new Date().toISOString(), user: req.userId });
  const timeoutMs = 8000;
  try {
    const userId = req.userId;
    const user = await withTimeout(User.findById(userId), timeoutMs);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let conversation = await withTimeout(ChatConversation.findOne({ userId }), timeoutMs);
    if (!conversation) {
      conversation = new ChatConversation({
        userId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        status: 'active',
      });
      await withTimeout(conversation.save(), timeoutMs);
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
  try {
    const { conversationId } = req.params;
    const messages = await withTimeout(
      ChatMessage.find({ conversationId }).sort({ createdAt: 1 }),
      timeoutMs
    );
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
  try {
    const { conversationId, message } = req.body;
    const userId = req.userId;
    const user = await withTimeout(User.findById(userId), timeoutMs);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Determine if sender is admin
    const senderRole = user.role === 'admin' ? 'admin' : 'user';
    
    const newMessage = new ChatMessage({
      conversationId,
      senderId: userId,
      senderName: `${user.firstName} ${user.lastName}`.trim(),
      senderRole,
      message,
      read: false,
    });
    await withTimeout(newMessage.save(), timeoutMs);
    // Update conversation last message time and content
    await withTimeout(
      ChatConversation.findByIdAndUpdate(
        conversationId,
        { 
          lastMessage: message,
          lastMessageTime: new Date(),
          unreadCount: senderRole === 'admin' ? 1 : 0
        },
        { new: true }
      ),
      timeoutMs
    );
    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Failed to send message', error: err.message });
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
