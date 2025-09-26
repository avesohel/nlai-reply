const mongoose = require('mongoose');

const replyTemplateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
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

replyTemplateSchema.methods.processTemplate = function(variables = {}) {
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

module.exports = mongoose.model('ReplyTemplate', replyTemplateSchema);