import mongoose, { Document, Schema } from 'mongoose';

export interface ITranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface ITranscript {
  text: string;
  segments: ITranscriptSegment[];
}

export interface IEmbedding {
  vector: number[];
  model: string;
  dimensions: number;
}

export interface IVideoMetadata {
  language?: string;
  confidence?: number;
  wordCount?: number;
  extractedAt?: Date;
  processingTime?: number;
}

export interface IAISentiment {
  score: number;
  label: string;
  confidence: number;
}

export interface IAIAnalysis {
  sentiment: IAISentiment;
  categories: string[];
  keywords: string[];
  themes: string[];
  entities: string[];
}

export interface IVideoTranscript extends Document {
  user: mongoose.Types.ObjectId;
  channelId: string;
  videoId: string;
  videoTitle?: string;
  videoDescription?: string;
  videoDuration?: number;
  transcript: ITranscript;
  summary?: string;
  keyTopics: string[];
  embedding?: IEmbedding;
  metadata: IVideoMetadata;
  aiAnalysis?: IAIAnalysis;
  status: 'processing' | 'completed' | 'failed';
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const videoTranscriptSchema = new Schema<IVideoTranscript>({
  user: {
    type: Schema.Types.ObjectId,
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
    themes: [String],
    entities: [String]
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  processingStartedAt: Date,
  processingCompletedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
videoTranscriptSchema.index({ user: 1, channelId: 1 });
videoTranscriptSchema.index({ videoId: 1 }, { unique: true });
videoTranscriptSchema.index({ status: 1 });
videoTranscriptSchema.index({ createdAt: -1 });
videoTranscriptSchema.index({ 'aiAnalysis.keywords': 1 });

export default mongoose.model<IVideoTranscript>('VideoTranscript', videoTranscriptSchema);