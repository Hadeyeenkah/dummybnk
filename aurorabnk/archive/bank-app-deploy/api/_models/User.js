// src/models/User.js
const mongoose = require('mongoose');

// Generate unique account number (12 digits)
const generateAccountNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${timestamp}${random}`;
};

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false // prevents password from being returned
    },

    phone: {
      type: String,
      default: null
    },

    avatarUrl: {
      type: String,
      default: null
    },

    dateOfBirth: {
      type: Date,
      default: null
    },

    balance: {
      type: Number,
      default: 0
    },

    // Bank account identifiers
    accountNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    routingNumber: {
      type: String,
      default: '026009593',
    },

    // Email verification
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      default: null
    },
    verificationExpires: {
      type: Date,
      default: null
    },

    // Password reset
    passwordResetToken: {
      type: String,
      default: null
    },
    passwordResetExpires: {
      type: Date,
      default: null
    },

    // Two-factor authentication (TOTP)
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      default: null,
      select: false
    },

    // Role-based access control
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },

    // For refresh token login systems
    refreshToken: {
      type: String,
      default: null
    },

    // Example field for transaction history or multiple accounts
    accounts: [
      {
        accountType: { type: String, default: 'checking' },
        accountNumber: { type: String },
        balance: { type: Number, default: 0 }
      }
    ],

    // Admin messages/notifications for users
    messages: [
      {
        message: {
          type: String,
          required: true
        },
        sender: {
          type: String,
          default: 'Admin'
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        read: {
          type: Boolean,
          default: false
        }
      }
    ]
  },
  { timestamps: true }
);

// Pre-save hook to generate account number
UserSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    let accountNumber;
    let isUnique = false;
    
    // Keep generating until we get a unique number
    while (!isUnique) {
      accountNumber = generateAccountNumber();
      const existing = await mongoose.model('User').findOne({ accountNumber });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.accountNumber = accountNumber;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
