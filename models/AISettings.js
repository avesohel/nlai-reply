const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  isEnabled: { type: Boolean, default: true },
  replyTone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'enthusiastic', 'informative', 'humorous'],
    default: 'friendly'
  },
  replyLength: {
    type: String,
    enum: ['short', 'medium', 'long'],
    default: 'medium'
  },
  personalityTraits: {
    enthusiasmLevel: { type: Number, min: 1, max: 10, default: 7 },
    formalityLevel: { type: Number, min: 1, max: 10, default: 5 },
    humorLevel: { type: Number, min: 1, max: 10, default: 3 },
    helpfulnessLevel: { type: Number, min: 1, max: 10, default: 9 }
  },
  customInstructions: {
    type: String,
    maxlength: 500,
    default: 'Be helpful, engaging, and authentic in your responses.'
  },
  replyFilters: {
    minimumSentimentScore: { type: Number, min: -1, max: 1, default: -0.5 },
    requiresQuestion: { type: Boolean, default: false },
    excludeSpam: { type: Boolean, default: true },
    minimumWordCount: { type: Number, min: 1, max: 100, default: 3 }
  },
  contextSettings: {
    useVideoTranscript: { type: Boolean, default: true },
    useChannelDescription: { type: Boolean, default: true },
    useRecentComments: { type: Boolean, default: true },
    maxContextLength: { type: Number, min: 500, max: 4000, default: 2000 }
  },
  responseRules: [{
    trigger: String,
    condition: String,
    response: String,
    priority: { type: Number, default: 1 }
  }],
  bannedWords: [String],
  requiredWords: [String],
  channelSpecificSettings: [{
    channelId: String,
    customTone: String,
    customInstructions: String,
    enabled: { type: Boolean, default: true }
  }],
  aiModel: {
    type: String,
    enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    default: 'gpt-3.5-turbo'
  },
  maxTokens: { type: Number, min: 50, max: 300, default: 150 },
  temperature: { type: Number, min: 0, max: 2, default: 0.7 },
  usage: {
    totalRepliesGenerated: { type: Number, default: 0 },
    currentMonthUsage: { type: Number, default: 0 },
    lastUsageReset: { type: Date, default: Date.now },
    averageResponseTime: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 }
  }
}, {
  timestamps: true
});

aiSettingsSchema.methods.getPromptContext = function(videoData, commentData) {
  const context = {
    tone: this.replyTone,
    length: this.replyLength,
    personality: this.personalityTraits,
    instructions: this.customInstructions,
    channelSpecific: null
  };

  if (videoData && videoData.channelId) {
    const channelSettings = this.channelSpecificSettings.find(
      setting => setting.channelId === videoData.channelId && setting.enabled
    );
    if (channelSettings) {
      context.channelSpecific = channelSettings;
    }
  }

  return context;
};

aiSettingsSchema.methods.shouldGenerateReply = function(commentData) {
  const { sentiment, wordCount, isSpam } = commentData;

  if (this.replyFilters.excludeSpam && isSpam) return false;
  if (sentiment && sentiment < this.replyFilters.minimumSentimentScore) return false;
  if (wordCount && wordCount < this.replyFilters.minimumWordCount) return false;
  if (this.replyFilters.requiresQuestion && !commentData.hasQuestion) return false;

  const bannedWordFound = this.bannedWords.some(word =>
    commentData.text.toLowerCase().includes(word.toLowerCase())
  );
  if (bannedWordFound) return false;

  if (this.requiredWords.length > 0) {
    const requiredWordFound = this.requiredWords.some(word =>
      commentData.text.toLowerCase().includes(word.toLowerCase())
    );
    if (!requiredWordFound) return false;
  }

  return true;
};

aiSettingsSchema.methods.incrementUsage = async function() {
  this.usage.totalRepliesGenerated += 1;
  this.usage.currentMonthUsage += 1;

  const now = new Date();
  const lastReset = new Date(this.usage.lastUsageReset);

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.currentMonthUsage = 1;
    this.usage.lastUsageReset = now;
  }

  return this.save();
};

aiSettingsSchema.methods.updateSuccessRate = function(successful) {
  const currentTotal = this.usage.totalRepliesGenerated;
  const currentSuccessRate = this.usage.successRate;

  const currentSuccessful = Math.round((currentTotal * currentSuccessRate) / 100);
  const newSuccessful = successful ? currentSuccessful + 1 : currentSuccessful;

  this.usage.successRate = Math.round((newSuccessful / (currentTotal + 1)) * 100);

  return this.save();
};

module.exports = mongoose.model('AISettings', aiSettingsSchema);