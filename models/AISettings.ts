import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReplyTone = 'professional' | 'friendly' | 'casual' | 'enthusiastic' | 'informative' | 'humorous';
export type ReplyLength = 'short' | 'medium' | 'long';
export type AIModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';

export interface IPersonalityTraits {
  enthusiasmLevel: number;
  formalityLevel: number;
  humorLevel: number;
  helpfulnessLevel: number;
}

export interface IReplyFilters {
  minimumSentimentScore: number;
  requiresQuestion: boolean;
  excludeSpam: boolean;
  minimumWordCount: number;
}

export interface IContextSettings {
  useVideoTranscript: boolean;
  useChannelDescription: boolean;
  useRecentComments: boolean;
  maxContextLength: number;
}

export interface IResponseRule {
  trigger: string;
  condition: string;
  response: string;
  priority: number;
}

export interface IChannelSpecificSetting {
  channelId: string;
  customTone?: string;
  customInstructions?: string;
  enabled: boolean;
}

export interface IAutomaticReplies {
  enabled: boolean;
  monitorNewVideos: boolean;
  monitorAllVideos: boolean;
  delayBetweenReplies: number;
  maxRepliesPerVideo: number;
  onlyReplyToQuestions: boolean;
  skipIfAlreadyReplied: boolean;
}

export interface IAIUsage {
  totalRepliesGenerated: number;
  currentMonthUsage: number;
  lastUsageReset: Date;
  averageResponseTime: number;
  successRate: number;
}

export interface IPromptContext {
  tone: ReplyTone;
  length: ReplyLength;
  personality: IPersonalityTraits;
  instructions: string;
  channelSpecific: IChannelSpecificSetting | null;
}

export interface ICommentData {
  text: string;
  sentiment?: number;
  wordCount?: number;
  isSpam?: boolean;
  hasQuestion?: boolean;
}

export interface IVideoData {
  channelId?: string;
}

export interface IAISettings extends Document {
  user: mongoose.Types.ObjectId;
  isEnabled: boolean;
  replyTone: ReplyTone;
  replyLength: ReplyLength;
  personalityTraits: IPersonalityTraits;
  customInstructions: string;
  replyFilters: IReplyFilters;
  contextSettings: IContextSettings;
  responseRules: IResponseRule[];
  bannedWords: string[];
  requiredWords: string[];
  channelSpecificSettings: IChannelSpecificSetting[];
  aiModel: AIModel;
  maxTokens: number;
  temperature: number;
  automaticReplies: IAutomaticReplies;
  usage: IAIUsage;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getPromptContext(videoData?: IVideoData, commentData?: ICommentData): IPromptContext;
  shouldGenerateReply(commentData: ICommentData): boolean;
  incrementUsage(): Promise<IAISettings>;
  updateSuccessRate(successful: boolean): Promise<IAISettings>;
}

const aiSettingsSchema = new Schema<IAISettings>({
  user: {
    type: Schema.Types.ObjectId,
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
  automaticReplies: {
    enabled: { type: Boolean, default: false },
    monitorNewVideos: { type: Boolean, default: true },
    monitorAllVideos: { type: Boolean, default: false },
    delayBetweenReplies: { type: Number, min: 10000, max: 300000, default: 30000 },
    maxRepliesPerVideo: { type: Number, min: 1, max: 50, default: 10 },
    onlyReplyToQuestions: { type: Boolean, default: false },
    skipIfAlreadyReplied: { type: Boolean, default: true }
  },
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

aiSettingsSchema.methods.getPromptContext = function(
  this: IAISettings,
  videoData?: IVideoData,
  commentData?: ICommentData
): IPromptContext {
  const context: IPromptContext = {
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

aiSettingsSchema.methods.shouldGenerateReply = function(
  this: IAISettings,
  commentData: ICommentData
): boolean {
  const { sentiment, wordCount, isSpam } = commentData;

  if (this.replyFilters.excludeSpam && isSpam) return false;
  if (sentiment !== undefined && sentiment < this.replyFilters.minimumSentimentScore) return false;
  if (wordCount !== undefined && wordCount < this.replyFilters.minimumWordCount) return false;
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

aiSettingsSchema.methods.incrementUsage = async function(this: IAISettings): Promise<IAISettings> {
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

aiSettingsSchema.methods.updateSuccessRate = function(
  this: IAISettings,
  successful: boolean
): Promise<IAISettings> {
  const currentTotal = this.usage.totalRepliesGenerated;
  const currentSuccessRate = this.usage.successRate;

  const currentSuccessful = Math.round((currentTotal * currentSuccessRate) / 100);
  const newSuccessful = successful ? currentSuccessful + 1 : currentSuccessful;

  this.usage.successRate = Math.round((newSuccessful / (currentTotal + 1)) * 100);

  return this.save();
};

export default mongoose.model<IAISettings>('AISettings', aiSettingsSchema);