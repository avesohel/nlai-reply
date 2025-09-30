import mongoose, { Document, Schema } from 'mongoose';

export type SentimentType = 'positive' | 'negative' | 'neutral' | 'any';

export interface ITemplateVariable {
  name: string;
  defaultValue: string;
  required: boolean;
}

export interface ITemplateConditions {
  keywords: string[];
  sentiment: SentimentType;
  minLikes: number;
  channelIds: string[];
}

export interface IReplyTemplate extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  content: string;
  triggers: string[];
  conditions: ITemplateConditions;
  isActive: boolean;
  usageCount: number;
  variables: ITemplateVariable[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  processTemplate(variables?: Record<string, string>): string;
}

const replyTemplateSchema = new Schema<IReplyTemplate>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  triggers: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  conditions: {
    keywords: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'any'],
      default: 'any'
    },
    minLikes: { type: Number, default: 0 },
    channelIds: [String]
  },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  variables: [{
    name: String,
    defaultValue: String,
    required: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

replyTemplateSchema.methods.processTemplate = function(
  this: IReplyTemplate,
  variables: Record<string, string> = {}
): string {
  let processedContent = this.content;

  this.variables.forEach(variable => {
    const value = variables[variable.name] || variable.defaultValue || '';
    const regex = new RegExp(`{{${variable.name}}}`, 'g');
    processedContent = processedContent.replace(regex, value);
  });

  processedContent = processedContent.replace(/{{username}}/g, variables.username || 'there');
  processedContent = processedContent.replace(/{{channelname}}/g, variables.channelName || 'Channel');

  return processedContent;
};

export default mongoose.model<IReplyTemplate>('ReplyTemplate', replyTemplateSchema);