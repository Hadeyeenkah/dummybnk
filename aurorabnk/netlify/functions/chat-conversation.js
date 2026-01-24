const jwt = require('jsonwebtoken');
const { connectDB } = require('../../backend/src/config/database');
const ChatConversation = require('../../backend/src/models/Chat').ChatConversation;
const ChatMessage = require('../../backend/src/models/Chat').ChatMessage;
const User = require('../../backend/src/models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    // Example: get or create conversation for user
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'No token provided' })
      };
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      await connectDB();
      const userId = decoded.id;
      let conversation = await ChatConversation.findOne({ userId });
      if (!conversation) {
        const user = await User.findById(userId);
        conversation = new ChatConversation({
          userId,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          userEmail: user.email,
          status: 'active',
        });
        await conversation.save();
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ conversation })
      };
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid or expired token' })
      };
    }
  }
  return {
    statusCode: 405,
    body: JSON.stringify({ message: 'Method Not Allowed' })
  };
};
