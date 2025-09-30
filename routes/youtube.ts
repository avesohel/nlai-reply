import express, { Request, Response } from 'express';
import { auth, subscriptionRequired } from '../middleware/auth';
import User from '../models/User';
import ReplyTemplate from '../models/ReplyTemplate';
import ReplyLog from '../models/ReplyLog';
import {
  getAuthUrl,
  getTokens,
  getChannelInfo,
  getVideoComments,
  replyToComment,
  refreshAccessToken,
  getChannelVideos,
  getVideoDetails
} from '../services/youtubeService';

const router = express.Router();

// Get YouTube OAuth URL
router.get('/auth-url', auth, (req: Request, res: Response) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// OAuth callback route
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_cancelled`);
    }

    // Redirect to frontend with the code so it can complete the connection
    res.redirect(`${process.env.CLIENT_URL}/youtube/callback?code=${encodeURIComponent(code as string)}`);
  } catch (error: any) {
    console.error('YouTube OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_failed`);
  }
});

// Connect YouTube channel
router.post('/connect', auth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const tokens = await getTokens(code);
    const channelInfo = await getChannelInfo(tokens.access_token!);

    const existingChannelIndex = user.youtubeChannels.findIndex(
      channel => channel.channelId === channelInfo.id
    );

    const channelData = {
      channelId: channelInfo.id,
      channelName: channelInfo.snippet.title,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      connected: true,
      lastSync: new Date()
    };

    if (existingChannelIndex !== -1) {
      user.youtubeChannels[existingChannelIndex] = channelData;
    } else {
      user.youtubeChannels.push(channelData);
    }

    await user.save();

    res.json({
      message: 'YouTube channel connected successfully',
      channel: {
        id: channelInfo.id,
        name: channelInfo.snippet.title,
        thumbnail: channelInfo.snippet.thumbnails.default.url,
        subscriberCount: channelInfo.statistics.subscriberCount,
        videoCount: channelInfo.statistics.videoCount
      }
    });
  } catch (error: any) {
    console.error('YouTube connection error:', error);
    res.status(500).json({
      message: 'Failed to connect YouTube channel',
      error: error.message
    });
  }
});

// Get user's connected YouTube channels
router.get('/channels', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const connectedChannels = user.youtubeChannels.filter(channel => channel.connected);

    res.json({
      channels: connectedChannels.map(channel => ({
        id: channel.channelId,
        name: channel.channelName,
        connected: channel.connected,
        lastSync: channel.lastSync
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Disconnect YouTube channel
router.delete('/channels/:channelId', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { channelId } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const channelIndex = user.youtubeChannels.findIndex(
      channel => channel.channelId === channelId
    );

    if (channelIndex === -1) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    user.youtubeChannels.splice(channelIndex, 1);
    await user.save();

    res.json({ message: 'YouTube channel disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get videos from a connected channel
router.get('/channels/:channelId/videos', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { channelId } = req.params;
    const { maxResults = 10 } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const channel = user.youtubeChannels.find(ch => ch.channelId === channelId && ch.connected);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found or not connected' });
    }

    let accessToken = channel.accessToken;

    // Try to refresh token if needed
    try {
      const videos = await getChannelVideos(channelId, accessToken, Number(maxResults));
      res.json({ videos });
    } catch (error: any) {
      if (error.message.includes('credentials')) {
        // Try to refresh the access token
        try {
          const newCredentials = await refreshAccessToken(channel.refreshToken);
          accessToken = newCredentials.access_token!;

          // Update stored token
          channel.accessToken = accessToken;
          await user.save();

          const videos = await getChannelVideos(channelId, accessToken, Number(maxResults));
          res.json({ videos });
        } catch (refreshError: any) {
          res.status(401).json({
            message: 'YouTube authentication expired. Please reconnect your channel.',
            requiresReauth: true
          });
        }
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get comments from a specific video
router.get('/videos/:videoId/comments', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { videoId } = req.params;
    const { maxResults = 20 } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find the channel that owns this video
    let accessToken: string | null = null;

    for (const channel of user.youtubeChannels) {
      if (channel.connected) {
        try {
          // Try to get video details to verify ownership
          await getVideoDetails(videoId, channel.accessToken);
          accessToken = channel.accessToken;
          break;
        } catch (error) {
          // Video not from this channel, continue
          continue;
        }
      }
    }

    if (!accessToken) {
      return res.status(404).json({
        message: 'Video not found in your connected channels'
      });
    }

    const comments = await getVideoComments(videoId, accessToken, Number(maxResults));

    res.json({
      comments: comments.map(comment => ({
        id: comment.id,
        text: comment.snippet.topLevelComment.snippet.textDisplay,
        author: comment.snippet.topLevelComment.snippet.authorDisplayName,
        publishedAt: comment.snippet.topLevelComment.snippet.publishedAt,
        likeCount: comment.snippet.topLevelComment.snippet.likeCount,
        canReply: comment.snippet.canReply
      }))
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reply to a comment
router.post('/reply', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { commentId, videoId, replyText, templateId } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!user.canReply()) {
      return res.status(403).json({
        message: 'Reply limit reached for current subscription period'
      });
    }

    // Find the appropriate access token
    let accessToken: string | null = null;
    let channelName = '';

    for (const channel of user.youtubeChannels) {
      if (channel.connected) {
        accessToken = channel.accessToken;
        channelName = channel.channelName;
        break;
      }
    }

    if (!accessToken) {
      return res.status(400).json({
        message: 'No connected YouTube channel found'
      });
    }

    // Send reply to YouTube
    const youtubeResponse = await replyToComment(commentId, replyText, accessToken);

    // Log the reply
    const replyLog = new ReplyLog({
      user: user._id,
      videoId,
      channelName,
      originalComment: {
        id: commentId,
        text: req.body.originalComment || '',
        author: req.body.commentAuthor || '',
        publishedAt: new Date()
      },
      replyContent: replyText,
      template: templateId,
      status: 'sent',
      sentAt: new Date(),
      youtubeReplyId: youtubeResponse.id,
      metadata: {
        processingTime: Date.now(),
        retryCount: 0
      }
    });

    await replyLog.save();
    await user.incrementUsage();

    res.json({
      message: 'Reply sent successfully',
      replyId: youtubeResponse.id,
      logId: replyLog._id
    });
  } catch (error: any) {
    console.error('Reply error:', error);

    // Log failed reply
    if (req.body.commentId) {
      try {
        const replyLog = new ReplyLog({
          user: req.user?._id,
          videoId: req.body.videoId,
          originalComment: {
            id: req.body.commentId,
            text: req.body.originalComment || '',
            author: req.body.commentAuthor || '',
            publishedAt: new Date()
          },
          replyContent: req.body.replyText,
          template: req.body.templateId,
          status: 'failed',
          error: error.message,
          metadata: {
            processingTime: Date.now(),
            retryCount: 0
          }
        });
        await replyLog.save();
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    res.status(500).json({
      message: 'Failed to send reply',
      error: error.message
    });
  }
});

export default router;