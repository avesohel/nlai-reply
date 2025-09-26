const express = require('express');
const { auth, subscriptionRequired } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const aiReplyService = require('../services/aiReplyService');
const { extractTranscript, getTranscriptsByUser, searchTranscripts, getTranscriptStats } = require('../services/transcriptService');
const vectorService = require('../services/vectorService');
const AISettings = require('../models/AISettings');
const VideoTranscript = require('../models/VideoTranscript');

const router = express.Router();

const aiSettingsSchema = Joi.object({
  isEnabled: Joi.boolean(),
  replyTone: Joi.string().valid('professional', 'friendly', 'casual', 'enthusiastic', 'informative', 'humorous'),
  replyLength: Joi.string().valid('short', 'medium', 'long'),
  personalityTraits: Joi.object({
    enthusiasmLevel: Joi.number().min(1).max(10),
    formalityLevel: Joi.number().min(1).max(10),
    humorLevel: Joi.number().min(1).max(10),
    helpfulnessLevel: Joi.number().min(1).max(10)
  }),
  customInstructions: Joi.string().max(500),
  replyFilters: Joi.object({
    minimumSentimentScore: Joi.number().min(-1).max(1),
    requiresQuestion: Joi.boolean(),
    excludeSpam: Joi.boolean(),
    minimumWordCount: Joi.number().min(1).max(100)
  }),
  contextSettings: Joi.object({
    useVideoTranscript: Joi.boolean(),
    useChannelDescription: Joi.boolean(),
    useRecentComments: Joi.boolean(),
    maxContextLength: Joi.number().min(500).max(4000)
  }),
  aiModel: Joi.string().valid('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'),
  maxTokens: Joi.number().min(50).max(300),
  temperature: Joi.number().min(0).max(2),
  bannedWords: Joi.array().items(Joi.string()),
  requiredWords: Joi.array().items(Joi.string())
});

const generateReplySchema = Joi.object({
  comment: Joi.object({
    id: Joi.string().required(),
    text: Joi.string().required(),
    author: Joi.string().required(),
    channelId: Joi.string(),
    likeCount: Joi.number().default(0)
  }).required(),
  videoId: Joi.string().required(),
  channelId: Joi.string(),
  options: Joi.object({
    forceRegenerate: Joi.boolean().default(false),
    saveToLog: Joi.boolean().default(true)
  }).default({})
});

router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await AISettings.findOne({ user: req.user._id });

    if (!settings) {
      settings = new AISettings({ user: req.user._id });
      await settings.save();
    }

    res.json({
      success: true,
      settings: {
        isEnabled: settings.isEnabled,
        replyTone: settings.replyTone,
        replyLength: settings.replyLength,
        personalityTraits: settings.personalityTraits,
        customInstructions: settings.customInstructions,
        replyFilters: settings.replyFilters,
        contextSettings: settings.contextSettings,
        aiModel: settings.aiModel,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        bannedWords: settings.bannedWords,
        requiredWords: settings.requiredWords,
        usage: settings.usage
      }
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', auth, subscriptionRequired, validateRequest(aiSettingsSchema), async (req, res) => {
  try {
    const result = await aiReplyService.updateAISettings(req.user._id, req.body);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'AI settings updated successfully',
      settings: result.settings
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-reply', auth, subscriptionRequired, validateRequest(generateReplySchema), async (req, res) => {
  try {
    const { comment, videoId, channelId, options } = req.body;

    if (!req.user.canReply()) {
      return res.status(403).json({
        success: false,
        message: 'Monthly reply limit exceeded',
        remainingReplies: 0
      });
    }

    const commentData = {
      ...comment,
      channelId: channelId || 'unknown'
    };

    const result = await aiReplyService.generateIntelligentReply(
      commentData,
      videoId,
      req.user._id,
      options
    );

    if (result.filtered) {
      return res.json({
        success: false,
        message: 'Comment filtered out based on AI settings',
        filtered: true,
        analysis: result.analysis
      });
    }

    if (!result.success && !result.reply) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to generate AI reply'
      });
    }

    res.json({
      success: true,
      reply: result.reply,
      confidence: result.confidence,
      analysis: result.analysis,
      context: result.context,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Generate AI reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/batch-generate', auth, subscriptionRequired, async (req, res) => {
  try {
    const { comments, videoId, channelId, options = {} } = req.body;

    if (!Array.isArray(comments) || comments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comments array is required and must not be empty'
      });
    }

    if (comments.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 comments allowed per batch'
      });
    }

    const availableReplies = req.user.getReplyLimit() - (req.user.usage.currentPeriodReplies || 0);
    if (availableReplies < comments.length) {
      return res.status(403).json({
        success: false,
        message: `Insufficient replies remaining. Available: ${availableReplies}, Requested: ${comments.length}`
      });
    }

    const enhancedComments = comments.map(comment => ({
      ...comment,
      channelId: channelId || 'unknown'
    }));

    const result = await aiReplyService.batchProcessComments(
      enhancedComments,
      videoId,
      req.user._id,
      options
    );

    res.json({
      success: true,
      message: `Processed ${result.processed} comments`,
      summary: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        filtered: result.filtered
      },
      results: result.results
    });
  } catch (error) {
    console.error('Batch generate AI replies error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transcripts', auth, async (req, res) => {
  try {
    const { channelId, limit = 10, skip = 0, sortBy = 'createdAt' } = req.query;

    const options = {
      channelId,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder: -1
    };

    const transcripts = await getTranscriptsByUser(req.user._id, options);

    res.json({
      success: true,
      transcripts,
      count: transcripts.length
    });
  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/transcripts/extract', auth, subscriptionRequired, async (req, res) => {
  try {
    const { videoId, channelId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'videoId is required'
      });
    }

    const result = await extractTranscript(videoId, req.user._id, channelId || 'default');

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: result.cached ? 'Transcript retrieved from cache' : 'Transcript extracted successfully',
      transcript: {
        videoId: result.transcript.videoId,
        videoTitle: result.transcript.videoTitle,
        summary: result.transcript.summary,
        keyTopics: result.transcript.keyTopics,
        wordCount: result.transcript.metadata?.wordCount,
        isProcessed: result.transcript.isProcessed,
        processingStatus: result.transcript.processingStatus
      },
      cached: result.cached
    });
  } catch (error) {
    console.error('Extract transcript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transcripts/search', auth, async (req, res) => {
  try {
    const { query, channelId, limit = 5 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = await searchTranscripts(req.user._id, query.trim(), {
      channelId,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      results,
      count: results.length,
      query: query.trim()
    });
  } catch (error) {
    console.error('Search transcripts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/transcripts/:videoId', auth, async (req, res) => {
  try {
    const { videoId } = req.params;

    const transcript = await VideoTranscript.findOne({
      videoId,
      user: req.user._id
    });

    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Transcript not found'
      });
    }

    await VideoTranscript.deleteOne({ _id: transcript._id });

    await vectorService.deleteVector(req.user._id, videoId);

    res.json({
      success: true,
      message: 'Transcript deleted successfully'
    });
  } catch (error) {
    console.error('Delete transcript error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analytics', auth, async (req, res) => {
  try {
    const [aiStats, transcriptStats] = await Promise.all([
      aiReplyService.getAIStats(req.user._id),
      getTranscriptStats(req.user._id)
    ]);

    const vectorStats = await vectorService.getIndexStats();

    res.json({
      success: true,
      analytics: {
        ai: aiStats.success ? aiStats.stats : null,
        transcripts: transcriptStats,
        vectors: vectorStats.success ? vectorStats.stats : null
      }
    });
  } catch (error) {
    console.error('Get AI analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/test-reply', auth, async (req, res) => {
  try {
    const { comment, settings } = req.body;

    if (!comment || !comment.text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const testCommentData = {
      id: 'test-comment',
      text: comment.text,
      author: comment.author || 'Test User',
      channelId: 'test-channel'
    };

    const result = await aiReplyService.generateIntelligentReply(
      testCommentData,
      'test-video-id',
      req.user._id,
      {
        forceRegenerate: true,
        saveToLog: false
      }
    );

    res.json({
      success: true,
      reply: result.reply,
      confidence: result.confidence,
      analysis: result.analysis,
      isTest: true
    });
  } catch (error) {
    console.error('Test AI reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;