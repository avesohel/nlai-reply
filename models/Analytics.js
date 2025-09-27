const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reply_sent', 'reply_engagement', 'template_used', 'channel_activity'],
    required: true
  },
  data: {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReplyTemplate' },
    channelId: String,
    videoId: String,
    commentId: String,
    replyText: String,
    originalComment: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    engagement: {
      likes: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    },
    metadata: {
      responseTime: Number, // in milliseconds
      aiConfidence: Number, // 0-1
      templateMatch: String,
      language: String
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
analyticsSchema.index({ user: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ user: 1, timestamp: -1 });
analyticsSchema.index({ 'data.templateId': 1, timestamp: -1 });
analyticsSchema.index({ 'data.channelId': 1, timestamp: -1 });

// Static methods for aggregated analytics
analyticsSchema.statics.getUserStats = async function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgEngagement: {
          $avg: {
            $add: [
              { $ifNull: ['$data.engagement.likes', 0] },
              { $ifNull: ['$data.engagement.replies', 0] }
            ]
          }
        }
      }
    }
  ];

  return this.aggregate(pipeline);
};

analyticsSchema.statics.getTemplatePerformance = async function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: 'template_used',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$data.templateId',
        usageCount: { $sum: 1 },
        avgLikes: { $avg: '$data.engagement.likes' },
        avgReplies: { $avg: '$data.engagement.replies' },
        totalEngagement: {
          $sum: {
            $add: [
              { $ifNull: ['$data.engagement.likes', 0] },
              { $ifNull: ['$data.engagement.replies', 0] }
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'replytemplates',
        localField: '_id',
        foreignField: '_id',
        as: 'template'
      }
    },
    {
      $unwind: '$template'
    },
    {
      $project: {
        templateName: '$template.name',
        usageCount: 1,
        avgLikes: { $round: ['$avgLikes', 2] },
        avgReplies: { $round: ['$avgReplies', 2] },
        totalEngagement: 1,
        engagementRate: {
          $round: [
            { $divide: ['$totalEngagement', '$usageCount'] },
            2
          ]
        }
      }
    },
    {
      $sort: { usageCount: -1 }
    }
  ];

  return this.aggregate(pipeline);
};

analyticsSchema.statics.getChannelStats = async function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
        'data.channelId': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$data.channelId',
        totalReplies: { $sum: 1 },
        avgEngagement: {
          $avg: {
            $add: [
              { $ifNull: ['$data.engagement.likes', 0] },
              { $ifNull: ['$data.engagement.replies', 0] }
            ]
          }
        },
        sentiments: {
          $push: '$data.sentiment'
        }
      }
    },
    {
      $project: {
        channelId: '$_id',
        totalReplies: 1,
        avgEngagement: { $round: ['$avgEngagement', 2] },
        positiveSentiment: {
          $size: {
            $filter: {
              input: '$sentiments',
              cond: { $eq: ['$$this', 'positive'] }
            }
          }
        },
        negativeSentiment: {
          $size: {
            $filter: {
              input: '$sentiments',
              cond: { $eq: ['$$this', 'negative'] }
            }
          }
        },
        neutralSentiment: {
          $size: {
            $filter: {
              input: '$sentiments',
              cond: { $eq: ['$$this', 'neutral'] }
            }
          }
        }
      }
    },
    {
      $sort: { totalReplies: -1 }
    }
  ];

  return this.aggregate(pipeline);
};

analyticsSchema.statics.getTimeSeriesData = async function(userId, dateRange = 30, granularity = 'day') {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  let groupByFormat;
  switch (granularity) {
    case 'hour':
      groupByFormat = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } };
      break;
    case 'day':
      groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
      break;
    case 'week':
      groupByFormat = { $dateToString: { format: "%Y-W%V", date: "$timestamp" } };
      break;
    case 'month':
      groupByFormat = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
      break;
    default:
      groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
  }

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: groupByFormat,
          type: '$type'
        },
        count: { $sum: 1 },
        totalEngagement: {
          $sum: {
            $add: [
              { $ifNull: ['$data.engagement.likes', 0] },
              { $ifNull: ['$data.engagement.replies', 0] }
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        data: {
          $push: {
            type: '$_id.type',
            count: '$count',
            engagement: '$totalEngagement'
          }
        },
        totalCount: { $sum: '$count' },
        totalEngagement: { $sum: '$totalEngagement' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Analytics', analyticsSchema);