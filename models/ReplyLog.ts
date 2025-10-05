import mongoose, { Document, Schema } from 'mongoose';

export type ReplyStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface IOriginalComment {
  id: string;
  text: string;
  author: string;
  publishedAt: Date;
}

export interface IReplyMetadata {
  processingTime?: number;
  retryCount: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface IReplyLog extends Document {
  user: mongoose.Types.ObjectId;
  videoId: string;
  videoTitle?: string;
  channelId?: string;
  channelName?: string;
  platform: 'youtube' | 'facebook';
  originalComment: IOriginalComment;
  replyContent: string;
  template?: mongoose.Types.ObjectId;
  status: ReplyStatus;
  sentAt?: Date;
  error?: string;
  youtubeReplyId?: string;
  facebookReplyId?: string;
  metadata: IReplyMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const replyLogSchema = new Schema<IReplyLog>({
  user: {
    type: Schema.Types.ObjectId,
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
  platform: {
    type: String,
    enum: ['youtube', 'facebook'],
    default: 'youtube'
  },
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
    type: Schema.Types.ObjectId,
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
  facebookReplyId: String,
  metadata: {
    processingTime: Number,
    retryCount: { type: Number, default: 0 },
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
replyLogSchema.index({ user: 1, createdAt: -1 });
replyLogSchema.index({ videoId: 1 });
replyLogSchema.index({ status: 1 });
replyLogSchema.index({ sentAt: -1 });
replyLogSchema.index({ 'originalComment.id': 1 });

export default mongoose.model<IReplyLog>('ReplyLog', replyLogSchema);