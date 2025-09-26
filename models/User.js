const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  youtubeChannels: [{
    channelId: String,
    channelName: String,
    accessToken: String,
    refreshToken: String,
    connected: { type: Boolean, default: false },
    lastSync: Date
  }],
  settings: {
    emailNotifications: { type: Boolean, default: true },
    replyDelay: { type: Number, default: 60, min: 30, max: 3600 },
    maxRepliesPerHour: { type: Number, default: 10, min: 1, max: 100 }
  },
  usage: {
    repliesSent: { type: Number, default: 0 },
    currentPeriodStart: Date,
    currentPeriodReplies: { type: Number, default: 0 }
  },
  stripeCustomerId: String,
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.canReply = function() {
  if (!this.subscription) return false;

  const now = new Date();
  const periodStart = this.usage.currentPeriodStart;

  if (!periodStart || (now - periodStart) > 30 * 24 * 60 * 60 * 1000) {
    this.usage.currentPeriodStart = now;
    this.usage.currentPeriodReplies = 0;
  }

  return this.usage.currentPeriodReplies < this.getReplyLimit();
};

userSchema.methods.getReplyLimit = function() {
  if (!this.subscription) return 0;

  const limits = {
    basic: 100,
    pro: 500,
    enterprise: 2000
  };

  return limits[this.subscription.plan] || 0;
};

userSchema.methods.incrementUsage = function() {
  this.usage.repliesSent += 1;
  this.usage.currentPeriodReplies += 1;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);