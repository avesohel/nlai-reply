const express = require('express');
const { auth, subscriptionRequired } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const User = require('../models/User');
const ReplyTemplate = require('../models/ReplyTemplate');
const ReplyLog = require('../models/ReplyLog');
const aiReplyService = require('../services/aiReplyService');
const {
  getAuthUrl,
  getTokens,
  getChannelInfo,
  getVideoComments,
  replyToComment,
  refreshAccessToken
} = require('../services/youtubeService');
const router = express.Router();

router.get('/auth-url', auth, (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// OAuth callback route
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_cancelled`);
    }

    // Store the code in session or redirect to frontend with code
    // For now, redirect to frontend with the code so it can complete the connection
    res.redirect(`${process.env.CLIENT_URL}/youtube/callback?code=${encodeURIComponent(code)}`);
  } catch (error) {
    console.error('YouTube OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_failed`);
  }
});

router.post('/connect', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    const tokens = await getTokens(code);
    const channelInfo = await getChannelInfo(tokens.access_token);

    const existingChannelIndex = user.youtubeChannels.findIndex(
      channel => channel.channelId === channelInfo.id
    );

    console.log(`Channel connection attempt: ${channelInfo.id}, existing index: ${existingChannelIndex}`);

    const channelData = {
      channelId: channelInfo.id,
      channelName: channelInfo.snippet.title,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      connected: true,
      lastSync: new Date()
    };

    if (existingChannelIndex >= 0) {
      // Update existing channel
      user.youtubeChannels[existingChannelIndex] = channelData;
      console.log('Updated existing channel');
    } else {
      // Add new channel
      user.youtubeChannels.push(channelData);
      console.log('Added new channel');
    }

    await user.save();

    res.json({
      message: 'YouTube channel connected successfully',
      channel: {
        channelId: channelInfo.id,
        channelName: channelInfo.snippet.title,
        thumbnailUrl: channelInfo.snippet.thumbnails?.default?.url
      }
    });
  } catch (error) {
    console.error('YouTube connect error:', error);
    res.status(500).json({ message: 'Failed to connect YouTube channel' });
  }
});

// Delete YouTube channel
router.delete('/channels/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const user = req.user;

    const channelIndex = user.youtubeChannels.findIndex(
      channel => channel.channelId === channelId
    );

    if (channelIndex === -1) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    user.youtubeChannels.splice(channelIndex, 1);
    await user.save();

    res.json({ message: 'YouTube channel disconnected successfully' });
  } catch (error) {
    console.error('YouTube disconnect error:', error);
    res.status(500).json({ message: 'Failed to disconnect YouTube channel' });
  }
});

router.delete('/disconnect/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const user = req.user;

    user.youtubeChannels = user.youtubeChannels.filter(
      channel => channel.channelId !== channelId
    );

    await user.save();

    res.json({ message: 'YouTube channel disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/channels', auth, async (req, res) => {
  try {
    const user = req.user;

    const channels = user.youtubeChannels.map(channel => ({
      channelId: channel.channelId,
      channelName: channel.channelName,
      connected: channel.connected,
      lastSync: channel.lastSync
    }));

    res.json({ channels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await ReplyTemplate.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ templates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/templates', auth, validateRequest(schemas.replyTemplate), async (req, res) => {
  try {
    const templateData = { ...req.body, user: req.user._id };
    const template = new ReplyTemplate(templateData);
    await template.save();

    res.status(201).json({
      message: 'Reply template created successfully',
      template
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/templates/:id', auth, validateRequest(schemas.replyTemplate), async (req, res) => {
  try {
    const template = await ReplyTemplate.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/templates/:id', auth, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/videos/:channelId/comments', auth, subscriptionRequired, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { videoId, maxResults = 10 } = req.query;

    const user = req.user;
    const channel = user.youtubeChannels.find(ch => ch.channelId === channelId);

    if (!channel || !channel.connected) {
      return res.status(404).json({ message: 'YouTube channel not connected' });
    }

    let accessToken = channel.accessToken;

    if (!accessToken) {
      try {
        const newTokens = await refreshAccessToken(channel.refreshToken);
        accessToken = newTokens.access_token;

        const channelIndex = user.youtubeChannels.findIndex(ch => ch.channelId === channelId);
        user.youtubeChannels[channelIndex].accessToken = accessToken;
        await user.save();
      } catch (tokenError) {
        return res.status(401).json({ message: 'Failed to refresh YouTube access token' });
      }
    }

    const comments = await getVideoComments(videoId, accessToken, parseInt(maxResults));

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Failed to fetch video comments' });
  }
});

router.post('/reply', auth, subscriptionRequired, async (req, res) => {
  try {
    const { channelId, videoId, commentId, replyText, templateId, useAI = false, comment } = req.body;

    const user = req.user;

    if (!user.canReply()) {
      return res.status(403).json({
        message: 'Monthly reply limit exceeded',
        remainingReplies: 0
      });
    }

    let finalReplyText = replyText;

    // Use AI to generate reply if requested and no manual reply provided
    if (useAI && !replyText && comment) {
      console.log('Generating AI reply for comment:', commentId);

      const aiResult = await aiReplyService.generateIntelligentReply(
        comment,
        videoId,
        user._id,
        { saveToLog: false }
      );

      if (aiResult.success) {
        finalReplyText = aiResult.reply;
        console.log('AI generated reply:', finalReplyText);
      } else {
        return res.status(400).json({
          message: aiResult.error || 'Failed to generate AI reply',
          fallback: aiResult.reply
        });
      }
    }

    if (!finalReplyText) {
      return res.status(400).json({
        message: 'Reply text is required'
      });
    }

    const channel = user.youtubeChannels.find(ch => ch.channelId === channelId);

    if (!channel || !channel.connected) {
      return res.status(404).json({ message: 'YouTube channel not connected' });
    }

    let accessToken = channel.accessToken;

    if (!accessToken) {
      try {
        const newTokens = await refreshAccessToken(channel.refreshToken);
        accessToken = newTokens.access_token;

        const channelIndex = user.youtubeChannels.findIndex(ch => ch.channelId === channelId);
        user.youtubeChannels[channelIndex].accessToken = accessToken;
        await user.save();
      } catch (tokenError) {
        return res.status(401).json({ message: 'Failed to refresh YouTube access token' });
      }
    }

    const replyLog = new ReplyLog({
      user: user._id,
      videoId,
      channelId,
      channelName: channel.channelName,
      originalComment: comment ? {
        id: commentId,
        text: comment.text,
        author: comment.author,
        publishedAt: comment.publishedAt
      } : { id: commentId },
      replyContent: finalReplyText,
      template: templateId || null,
      status: 'pending',
      metadata: {
        aiGenerated: useAI && !replyText,
        processingTime: 0,
        retryCount: 0
      }
    });

    try {
      const youtubeReply = await replyToComment(commentId, finalReplyText, accessToken);

      replyLog.status = 'sent';
      replyLog.sentAt = new Date();
      replyLog.youtubeReplyId = youtubeReply.id;

      await user.incrementUsage();

      res.json({
        message: 'Reply sent successfully',
        replyId: youtubeReply.id,
        replyText: finalReplyText,
        aiGenerated: useAI && !replyText,
        remainingReplies: user.getReplyLimit() - user.usage.currentPeriodReplies
      });
    } catch (replyError) {
      replyLog.status = 'failed';
      replyLog.error = replyError.message;

      res.status(500).json({ message: 'Failed to send reply to YouTube' });
    } finally {
      await replyLog.save();
    }
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/replies', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, channelId } = req.query;

    const query = { user: req.user._id };

    if (status) query.status = status;
    if (channelId) query.channelId = channelId;

    const replies = await ReplyLog.find(query)
      .populate('template', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ReplyLog.countDocuments(query);

    res.json({
      replies,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;