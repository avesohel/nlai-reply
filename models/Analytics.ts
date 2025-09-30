import mongoose, { Document, Schema, Model } from 'mongoose';

export type AnalyticsType = 'reply_sent' | 'reply_engagement' | 'template_used' | 'channel_activity';
export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface IEngagementData {
  likes: number;
  replies: number;
  views: number;
}

export interface IAnalyticsMetadata {
  responseTime?: number;
  aiConfidence?: number;
  templateMatch?: string;
  language?: string;
}

export interface IAnalyticsData {
  templateId?: mongoose.Types.ObjectId;
  channelId?: string;
  videoId?: string;
  commentId?: string;
  replyText?: string;
  originalComment?: string;
  sentiment?: SentimentLabel;
  engagement: IEngagementData;
  metadata: IAnalyticsMetadata;
}

export interface IAnalytics extends Document {
  user: mongoose.Types.ObjectId;
  type: AnalyticsType;
  data: IAnalyticsData;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsModel extends Model<IAnalytics> {
  getUserStats(userId: string, dateRange?: number): Promise<any[]>;
  getTemplatePerformance(userId: string, dateRange?: number): Promise<any[]>;
  getChannelStats(userId: string, dateRange?: number): Promise<any[]>;
  getTimeSeriesData(userId: string, dateRange?: number, granularity?: string): Promise<any[]>;
}

const analyticsSchema = new Schema<IAnalytics>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reply_sent', 'reply_engagement', 'template_used', 'channel_activity'],
    required: true
  },
  data: {
    templateId: { type: Schema.Types.ObjectId, ref: 'ReplyTemplate' },
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
      responseTime: Number,
      aiConfidence: Number,
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
analyticsSchema.statics.getUserStats = async function(userId: string, dateRange: number = 30): Promise<any[]> {
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

analyticsSchema.statics.getTemplatePerformance = async function(userId: string, dateRange: number = 30): Promise<any[]> {
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
      $sort: { usageCount: -1 as -1 }
    }
  ];

  return this.aggregate(pipeline);
};

analyticsSchema.statics.getChannelStats = async function(userId: string, dateRange: number = 30): Promise<any[]> {
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
        }
      }
    },
    {
      $sort: { totalReplies: -1 as -1 }
    }
  ];

  return this.aggregate(pipeline);
};

analyticsSchema.statics.getTimeSeriesData = async function(
  userId: string,
  dateRange: number = 30,
  granularity: string = 'day'
): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  let groupByFormat: any;
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
      $sort: { '_id.date': 1 as 1 }
    }
  ];

  return this.aggregate(pipeline);
};

export default mongoose.model<IAnalytics, IAnalyticsModel>('Analytics', analyticsSchema);