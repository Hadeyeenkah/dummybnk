const express = require('express');
const { ChatMessage, ChatConversation } = require('../models/Chat');
const { User } = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get or create conversation for current user
router.get('/conversation', protect, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let conversation = await ChatConversation.findOne({ userId });

    if (!conversation) {
      conversation = new ChatConversation({
        userId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        status: 'active',
      });
      await conversation.save();
    }

    res.json({ success: true, conversation });
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
});

// Get messages for a conversation
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newMessage = new ChatMessage({
      conversationId,
      senderId: userId,
      senderRole: user.role === 'admin' ? 'admin' : 'user',
      senderName: `${user.firstName} ${user.lastName}`.trim(),
      message,
    });

    await newMessage.save();

    // Update conversation
    await ChatConversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: message,
        lastMessageTime: new Date(),
      }
    );

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/messages/:conversationId/read', protect, async (req, res) => {
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
