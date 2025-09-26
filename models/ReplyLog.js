const mongoose = require('mongoose');

const replyLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  videoTitle: String,
  channelId: String,
  channelName: String,
  originalComment: {
    id: String,
    text: String,
    author: String,
    publishedAt: Date
  },
  replyContent: {
    type: String,
    required: true
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReplyTemplate'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped'],
    default: 'pending'
  },
  sentAt: Date,
  error: String,
  youtubeReplyId: String,
  metadata: {
    processingTime: Number,
    retryCount: { type: Number, default: 0 },
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

replyLogSchema.index({ user: 1, createdAt: -1 });
replyLogSchema.index({ videoId: 1 });
replyLogSchema.index({ status: 1 });

replyLogSchema.statics.getStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('ReplyLog', replyLogSchema);