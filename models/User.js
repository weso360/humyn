const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'email';
    }
  },
  picture: String,
  provider: {
    type: String,
    enum: ['google', 'email'],
    default: 'email'
  },
  plan: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  stripeCustomerId: String,
  subscriptionId: String,
  subscriptionStatus: String,
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: 5
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.methods.canUseService = function() {
  if (this.plan === 'premium' || this.plan === 'enterprise') {
    return true;
  }
  return this.usageCount < this.maxUsage;
};

module.exports = mongoose.model('User', userSchema);