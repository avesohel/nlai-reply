import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IYouTubeChannel {
  channelId: string;
  channelName: string;
  accessToken: string;
  refreshToken: string;
  connected: boolean;
  lastSync?: Date;
}

export interface IFacebookPage {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  userAccessToken: string; // Store user token to refresh page tokens
  connected: boolean;
  lastSync?: Date;
  followersCount?: number;
  category?: string;
}

export interface IUserSettings {
  emailNotifications: boolean;
  replyDelay: number;
  maxRepliesPerHour: number;
}

export interface IUserUsage {
  repliesSent: number;
  currentPeriodStart?: Date;
  currentPeriodReplies: number;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  subscription?: mongoose.Types.ObjectId;
  youtubeChannels: IYouTubeChannel[];
  facebookPages: IFacebookPage[];
  settings: IUserSettings;
  usage: IUserUsage;
  stripeCustomerId?: string; // Legacy field for migration
  pabblyCustomerId?: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  canReply(): boolean;
  getReplyLimit(): number;
  incrementUsage(): Promise<IUser>;
}

const userSchema = new Schema<IUser>({
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
    type: Schema.Types.ObjectId,
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
  facebookPages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    userAccessToken: String,
    connected: { type: Boolean, default: false },
    lastSync: Date,
    followersCount: Number,
    category: String
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
  stripeCustomerId: String, // Legacy field for migration
  pabblyCustomerId: String,
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

userSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.canReply = function(this: IUser): boolean {
  if (!this.subscription) return false;

  const now = new Date();
  const periodStart = this.usage.currentPeriodStart;

  if (!periodStart || (now.getTime() - periodStart.getTime()) > 30 * 24 * 60 * 60 * 1000) {
    this.usage.currentPeriodStart = now;
    this.usage.currentPeriodReplies = 0;
  }

  return this.usage.currentPeriodReplies < this.getReplyLimit();
};

userSchema.methods.getReplyLimit = function(this: IUser): number {
  if (!this.subscription) return 0;

  const limits: Record<string, number> = {
    basic: 100,
    pro: 500,
    enterprise: 2000
  };

  // Note: This would need to be updated once subscription model is converted
  return limits[(this.subscription as any).plan] || 0;
};

userSchema.methods.incrementUsage = function(this: IUser): Promise<IUser> {
  this.usage.repliesSent += 1;
  this.usage.currentPeriodReplies += 1;
  return this.save();
};

export default mongoose.model<IUser>('User', userSchema);