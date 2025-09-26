const { generateReply, analyzeCommentIntent } = require('./openaiService');
const { extractTranscript, getTranscriptByVideoId } = require('./transcriptService');
const vectorService = require('./vectorService');
const { getVideoDetails } = require('./youtubeService');

const VideoTranscript = require('../models/VideoTranscript');
const AISettings = require('../models/AISettings');
const ReplyLog = require('../models/ReplyLog');

class AIReplyService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await vectorService.initialize();
      this.initialized = true;
      console.log('✅ AI Reply Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Reply Service:', error);
    }
  }

  async generateIntelligentReply(commentData, videoId, userId, options = {}) {
    try {
      await this.initialize();

      const {
        forceRegenerate = false,
        useTemplate = true,
        saveToLog = true
      } = options;

      const aiSettings = await this.getOrCreateAISettings(userId);

      if (!aiSettings.isEnabled) {
        return {
          success: false,
          error: 'AI replies are disabled for this user',
          fallback: true
        };
      }

      const commentAnalysis = await this.analyzeComment(commentData.text);

      if (!aiSettings.shouldGenerateReply({
        ...commentData,
        ...commentAnalysis.analysis
      })) {
        return {
          success: false,
          error: 'Comment does not meet reply criteria',
          analysis: commentAnalysis.analysis,
          filtered: true
        };
      }

      const videoContext = await this.buildVideoContext(videoId, userId);

      const relevantContext = await vectorService.getRelevantContext(
        commentData.text,
        userId,
        videoId
      );

      const userSettings = aiSettings.getPromptContext(videoContext, commentData);

      const enhancedCommentData = {
        ...commentData,
        ...commentAnalysis.analysis,
        context: relevantContext.context
      };

      const replyResult = await generateReply(
        enhancedCommentData,
        videoContext,
        userSettings
      );

      await aiSettings.incrementUsage();

      if (saveToLog) {
        await this.saveReplyToLog({
          userId,
          videoId,
          commentData: enhancedCommentData,
          replyResult,
          videoContext,
          analysis: commentAnalysis.analysis
        });
      }

      await aiSettings.updateSuccessRate(replyResult.success);

      return {
        success: replyResult.success,
        reply: replyResult.reply || replyResult.fallbackReply,
        confidence: this.calculateConfidence(replyResult, commentAnalysis, relevantContext),
        analysis: commentAnalysis.analysis,
        context: {
          videoTitle: videoContext.title,
          relevantContent: relevantContext.matches.length > 0,
          tokensUsed: replyResult.metadata?.tokensUsed || 0,
          responseTime: replyResult.metadata?.responseTime || 0
        },
        metadata: replyResult.metadata
      };
    } catch (error) {
      console.error('AI reply generation error:', error);
      return {
        success: false,
        error: error.message,
        reply: this.generateFallbackReply(commentData, 'friendly')
      };
    }
  }

  async buildVideoContext(videoId, userId) {
    try {
      let transcript = await getTranscriptByVideoId(videoId);

      if (!transcript) {
        const channelId = 'default';
        const extractResult = await extractTranscript(videoId, userId, channelId);

        if (extractResult.success) {
          transcript = extractResult.transcript;

          if (transcript.isProcessed) {
            await vectorService.upsertTranscript({
              videoId: transcript.videoId,
              userId,
              transcript: transcript.transcript.text,
              summary: transcript.summary,
              keyTopics: transcript.keyTopics,
              videoTitle: transcript.videoTitle
            });
          }
        }
      }

      const context = {
        title: transcript?.videoTitle || 'Unknown Video',
        description: transcript?.videoDescription || '',
        summary: transcript?.summary || '',
        keyTopics: transcript?.keyTopics || [],
        transcript: transcript?.getContextForComment?.() || '',
        duration: transcript?.videoDuration || 0,
        hasTranscript: !!transcript?.transcript?.text
      };

      return context;
    } catch (error) {
      console.error('Error building video context:', error);
      return {
        title: 'Unknown Video',
        description: '',
        summary: '',
        keyTopics: [],
        transcript: '',
        duration: 0,
        hasTranscript: false
      };
    }
  }

  async analyzeComment(commentText) {
    try {
      return await analyzeCommentIntent(commentText);
    } catch (error) {
      console.error('Comment analysis error:', error);
      return {
        success: false,
        error: error.message,
        analysis: {
          hasQuestion: commentText.includes('?'),
          sentiment: 'neutral',
          isSpam: false,
          category: 'general',
          keywords: []
        }
      };
    }
  }

  async getOrCreateAISettings(userId) {
    try {
      let settings = await AISettings.findOne({ user: userId });

      if (!settings) {
        settings = new AISettings({
          user: userId,
          isEnabled: true,
          replyTone: 'friendly',
          replyLength: 'medium'
        });
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('Error getting AI settings:', error);
      throw error;
    }
  }

  calculateConfidence(replyResult, commentAnalysis, relevantContext) {
    let confidence = 0.7;

    if (replyResult.success) confidence += 0.2;

    if (commentAnalysis.success && commentAnalysis.analysis) {
      confidence += 0.1;
    }

    if (relevantContext.success && relevantContext.matches.length > 0) {
      confidence += 0.1 * Math.min(relevantContext.matches.length, 3) / 3;
    }

    if (replyResult.metadata?.finishReason === 'stop') {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  async saveReplyToLog(logData) {
    try {
      const {
        userId,
        videoId,
        commentData,
        replyResult,
        videoContext,
        analysis
      } = logData;

      const replyLog = new ReplyLog({
        user: userId,
        videoId,
        videoTitle: videoContext.title,
        channelId: commentData.channelId || 'unknown',
        channelName: commentData.channelName || 'Unknown Channel',
        originalComment: {
          id: commentData.id,
          text: commentData.text,
          author: commentData.author,
          publishedAt: commentData.publishedAt
        },
        replyContent: replyResult.reply || replyResult.fallbackReply,
        status: replyResult.success ? 'generated' : 'failed',
        error: replyResult.error || null,
        metadata: {
          aiGenerated: true,
          model: replyResult.metadata?.model || 'unknown',
          tokensUsed: replyResult.metadata?.tokensUsed || 0,
          processingTime: replyResult.metadata?.responseTime || 0,
          confidence: this.calculateConfidence(replyResult, { analysis }, { matches: [] }),
          analysis: analysis,
          hasVideoContext: !!videoContext.hasTranscript,
          retryCount: 0
        }
      });

      await replyLog.save();
      console.log(`AI reply logged for video: ${videoId}`);
    } catch (error) {
      console.error('Error saving reply log:', error);
    }
  }

  generateFallbackReply(commentData, tone = 'friendly') {
    const fallbacks = {
      friendly: [
        `Thanks for watching and sharing your thoughts! 😊`,
        `I appreciate your comment! Thanks for being part of the community! 🙏`,
        `Great to see you here! Thanks for the engagement! 👍`
      ],
      professional: [
        `Thank you for your thoughtful comment.`,
        `I appreciate your feedback and engagement.`,
        `Thank you for watching and contributing to the discussion.`
      ],
      casual: [
        `Thanks for watching! 🎉`,
        `Appreciate you! 💪`,
        `Thanks for the comment! 🔥`
      ]
    };

    const options = fallbacks[tone] || fallbacks.friendly;
    return options[Math.floor(Math.random() * options.length)];
  }

  async batchProcessComments(comments, videoId, userId, options = {}) {
    const results = [];

    for (const comment of comments) {
      try {
        const result = await this.generateIntelligentReply(
          comment,
          videoId,
          userId,
          options
        );

        results.push({
          commentId: comment.id,
          success: result.success,
          reply: result.reply,
          confidence: result.confidence,
          filtered: result.filtered || false,
          error: result.error || null
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          commentId: comment.id,
          success: false,
          reply: null,
          confidence: 0,
          filtered: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && !r.filtered).length,
      filtered: results.filter(r => r.filtered).length,
      results
    };
  }

  async updateAISettings(userId, settings) {
    try {
      const aiSettings = await this.getOrCreateAISettings(userId);

      Object.keys(settings).forEach(key => {
        if (aiSettings.schema.paths[key] && settings[key] !== undefined) {
          aiSettings[key] = settings[key];
        }
      });

      await aiSettings.save();

      return {
        success: true,
        settings: aiSettings
      };
    } catch (error) {
      console.error('Error updating AI settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAIStats(userId) {
    try {
      const aiSettings = await AISettings.findOne({ user: userId });
      const replyLogs = await ReplyLog.find({
        user: userId,
        'metadata.aiGenerated': true
      }).sort({ createdAt: -1 }).limit(100);

      const stats = {
        totalRepliesGenerated: aiSettings?.usage.totalRepliesGenerated || 0,
        currentMonthUsage: aiSettings?.usage.currentMonthUsage || 0,
        successRate: aiSettings?.usage.successRate || 0,
        averageResponseTime: aiSettings?.usage.averageResponseTime || 0,
        recentActivity: replyLogs.slice(0, 10).map(log => ({
          videoTitle: log.videoTitle,
          reply: log.replyContent.substring(0, 100) + '...',
          confidence: log.metadata.confidence,
          createdAt: log.createdAt
        })),
        settings: {
          isEnabled: aiSettings?.isEnabled || false,
          replyTone: aiSettings?.replyTone || 'friendly',
          replyLength: aiSettings?.replyLength || 'medium'
        }
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error getting AI stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const aiReplyService = new AIReplyService();

module.exports = aiReplyService;