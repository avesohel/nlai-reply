const mongoose = require('mongoose');

const videoTranscriptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  videoId: {
    type: String,
    required: true,
    unique: true
  },
  videoTitle: String,
  videoDescription: String,
  videoDuration: Number,
  transcript: {
    text: String,
    segments: [{
      text: String,
      start: Number,
      duration: Number
    }]
  },
  summary: String,
  keyTopics: [String],
  embedding: {
    vector: [Number],
    model: String,
    dimensions: Number
  },
  metadata: {
    language: String,
    confidence: Number,
    wordCount: Number,
    extractedAt: Date,
    processingTime: Number
  },
  aiAnalysis: {
    sentiment: {
      score: Number,
      label: String,
      confidence: Number
    },
    categories: [String],
    keywords: [String],
    entities: [{
      name: String,
      type: String,
      confidence: Number
    }]
  },
  isProcessed: { type: Boolean, default: false },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: String
}, {
  timestamps: true
});

videoTranscriptSchema.index({ user: 1, channelId: 1 });
videoTranscriptSchema.index({ videoId: 1 }, { unique: true });
videoTranscriptSchema.index({ processingStatus: 1 });
videoTranscriptSchema.index({ keyTopics: 1 });

videoTranscriptSchema.methods.getContextForComment = function(commentText) {
  const maxContextLength = parseInt(process.env.AI_MAX_CONTEXT_LENGTH) || 2000;

  if (!this.transcript.text) return '';

  let context = this.summary || '';
  if (context.length < maxContextLength) {
    const remainingLength = maxContextLength - context.length - 100;
    if (remainingLength > 0) {
      context += '\n\nTranscript: ' + this.transcript.text.substring(0, remainingLength);
    }
  }

  return context;
};

videoTranscriptSchema.statics.findSimilarContent = async function(query, userId, limit = 5) {
  return this.find({
    user: userId,
    isProcessed: true,
    $text: { $search: query }
  })
  .limit(limit)
  .select('videoId videoTitle summary keyTopics')
  .sort({ score: { $meta: 'textScore' } });
};

videoTranscriptSchema.pre('save', function(next) {
  if (this.transcript.text && !this.metadata.wordCount) {
    this.metadata.wordCount = this.transcript.text.split(/\s+/).length;
  }
  next();
});

module.exports = mongoose.model('VideoTranscript', videoTranscriptSchema);