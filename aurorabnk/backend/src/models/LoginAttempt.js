const mongoose = require('mongoose');

const LoginAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    success: { type: Boolean, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoginAttempt', LoginAttemptSchema);
