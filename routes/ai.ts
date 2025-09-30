import express, { Request, Response } from 'express';
import { auth, subscriptionRequired } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import AISettings from '../models/AISettings';
import VideoTranscript from '../models/VideoTranscript';
import { generateReply } from '../services/openaiService';

const router = express.Router();

// Get AI settings for user
router.get('/settings', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let settings = await AISettings.findOne({ user: user._id });

    if (!settings) {
      // Create default settings
      settings = new AISettings({
        user: user._id,
        isEnabled: true,
        replyTone: 'friendly',
        replyLength: 'medium',
        personalityTraits: {
          enthusiasmLevel: 7,
          formalityLevel: 5,
          humorLevel: 3,
          helpfulnessLevel: 9
        },
        customInstructions: 'Be helpful, engaging, and authentic in your responses.',
        replyFilters: {
          minimumSentimentScore: -0.5,
          requiresQuestion: false,
          excludeSpam: true,
          minimumWordCount: 3
        },
        contextSettings: {
          useVideoTranscript: true,
          useChannelDescription: true,
          useRecentComments: true,
          maxContextLength: 2000
        },
        aiModel: 'gpt-3.5-turbo',
        maxTokens: 150,
        temperature: 0.7
      });

      await settings.save();
    }

    res.json({ settings });
  } catch (error: any) {
    console.error('Get AI settings error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update AI settings
router.put('/settings', auth, validateRequest(schemas.aiSettings), async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const settings = await AISettings.findOneAndUpdate(
      { user: user._id },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: 'AI settings updated successfully',
      settings
    });
  } catch (error: any) {
    console.error('Update AI settings error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate AI reply for a comment
router.post('/generate-reply', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { comment, videoContext, useCustomSettings } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!comment?.text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ user: user._id });
    if (!aiSettings?.isEnabled) {
      return res.status(400).json({
        message: 'AI reply generation is disabled. Please enable it in settings.'
      });
    }

    // Check if user can generate reply
    if (!user.canReply()) {
      return res.status(403).json({
        message: 'Reply limit reached for current subscription period'
      });
    }

    // Prepare comment data for AI
    const commentData = {
      text: comment.text,
      author: comment.author,
      timestamp: comment.timestamp,
      likes: comment.likes || 0,
      sentiment: comment.sentiment
    };

    // Check if comment should get a reply based on filters
    if (!aiSettings.shouldGenerateReply(commentData)) {
      return res.status(400).json({
        message: 'Comment does not meet reply criteria based on your settings'
      });
    }

    // Get prompt context
    const promptContext = aiSettings.getPromptContext(videoContext, commentData);

    // Generate reply using OpenAI
    const replyResponse = await generateReply(commentData, videoContext, promptContext);

    // Update AI settings usage
    await aiSettings.incrementUsage();

    res.json({
      reply: replyResponse.reply,
      confidence: replyResponse.confidence,
      metadata: replyResponse.metadata,
      message: 'Reply generated successfully'
    });

  } catch (error: any) {
    console.error('Generate reply error:', error);

    // Update AI settings with failure
    try {
      const aiSettings = await AISettings.findOne({ user: req.user?._id });
      if (aiSettings) {
        await aiSettings.updateSuccessRate(false);
      }
    } catch (updateError) {
      console.error('Failed to update success rate:', updateError);
    }

    res.status(500).json({
      message: 'Failed to generate reply',
      error: error.message
    });
  }
});

// Test AI reply generation (without saving)
router.post('/test-reply', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { comment, settings } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!comment?.text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const commentData = {
      text: comment.text,
      author: comment.author || 'Test User',
      sentiment: comment.sentiment || 0
    };

    const testSettings = settings || {
      tone: 'friendly',
      length: 'medium',
      instructions: 'Generate a helpful test reply'
    };

    const replyResponse = await generateReply(commentData, {}, testSettings);

    res.json({
      reply: replyResponse.reply,
      confidence: replyResponse.confidence,
      metadata: replyResponse.metadata,
      message: 'Test reply generated successfully'
    });

  } catch (error: any) {
    console.error('Test reply error:', error);
    res.status(500).json({
      message: 'Failed to generate test reply',
      error: error.message
    });
  }
});

// Get AI usage statistics
router.get('/usage', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const aiSettings = await AISettings.findOne({ user: user._id });

    const usage = {
      totalRepliesGenerated: aiSettings?.usage.totalRepliesGenerated || 0,
      currentMonthUsage: aiSettings?.usage.currentMonthUsage || 0,
      successRate: aiSettings?.usage.successRate || 100,
      averageResponseTime: aiSettings?.usage.averageResponseTime || 0,
      userRepliesSent: user.usage.repliesSent,
      currentPeriodReplies: user.usage.currentPeriodReplies,
      canReply: user.canReply(),
      replyLimit: user.getReplyLimit()
    };

    res.json({ usage });
  } catch (error: any) {
    console.error('Get AI usage error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get AI analytics
router.get('/analytics', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const aiSettings = await AISettings.findOne({ user: user._id });

    const analytics = {
      totalRepliesGenerated: aiSettings?.usage.totalRepliesGenerated || 0,
      currentMonthUsage: aiSettings?.usage.currentMonthUsage || 0,
      successRate: aiSettings?.usage.successRate || 100,
      averageResponseTime: aiSettings?.usage.averageResponseTime || 0,
      isEnabled: aiSettings?.isEnabled || false,
      lastUsageReset: aiSettings?.usage.lastUsageReset || new Date()
    };

    res.json({ analytics });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;