import express, { Request, Response } from 'express';
import { auth, subscriptionRequired } from '../middleware/auth';
import User from '../models/User';
import ReplyTemplate from '../models/ReplyTemplate';
import ReplyLog from '../models/ReplyLog';
import {
  getFacebookAuthUrl,
  getFacebookTokens,
  refreshFacebookToken,
  getUserPages,
  getPageInfo,
  getPagePosts,
  getPostComments,
  replyToComment,
  getCommentDetails
} from '../services/facebookService';

const router = express.Router();

// Get Facebook OAuth URL
router.get('/auth-url', auth, (req: Request, res: Response) => {
  try {
    const authUrl = getFacebookAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Facebook OAuth callback route
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_failed&description=${encodeURIComponent(error_description as string)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_cancelled`);
    }

    // Redirect to frontend with the code
    res.redirect(`${process.env.CLIENT_URL}/facebook/callback?code=${encodeURIComponent(code as string)}`);
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?error=oauth_failed`);
  }
});

// Connect Facebook Page
router.post('/connect', auth, async (req: Request, res: Response) => {
  try {
    const { code, pageId } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Exchange OAuth code for tokens
    const tokens = await getFacebookTokens(code);
    const userAccessToken = tokens.access_token;

    // Get user's Facebook Pages
    const userPages = await getUserPages(userAccessToken);

    if (!pageId) {
      // If no pageId provided, return list of pages for user to choose
      const pagesWithInfo = await Promise.all(
        userPages.map(async (page: any) => {
          try {
            const pageInfo = await getPageInfo(page.id, page.access_token);
            return { ...page, ...pageInfo };
          } catch (error) {
            return page;
          }
        })
      );

      return res.json({
        pages: pagesWithInfo.map(page => ({
          id: page.id,
          name: page.name,
          category: page.category,
          followersCount: page.followers_count,
          isConnected: false
        }))
      });
    }

    // Connect specific page
    const selectedPage = userPages.find((page: any) => page.id === pageId);
    if (!selectedPage) {
      return res.status(404).json({ message: 'Page not found in your Facebook account' });
    }

    const pageInfo = await getPageInfo(pageId, selectedPage.access_token);

    const pageData = {
      pageId: pageInfo.id,
      pageName: pageInfo.name,
      pageAccessToken: selectedPage.access_token,
      userAccessToken: userAccessToken,
      connected: true,
      lastSync: new Date(),
      followersCount: pageInfo.followers_count,
      category: pageInfo.category
    };

    // Get fresh user data to prevent race conditions and duplicates
    const freshUser = await User.findById(user._id);
    if (!freshUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const freshPageIndex = freshUser.facebookPages.findIndex(
      page => page.pageId === pageInfo.id
    );

    if (freshPageIndex !== -1) {
      // Update existing page
      freshUser.facebookPages[freshPageIndex] = pageData;
    } else {
      // Add new page
      freshUser.facebookPages.push(pageData);
    }

    await freshUser.save();

    res.json({
      message: 'Facebook Page connected successfully',
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        category: pageInfo.category,
        followersCount: pageInfo.followers_count,
        picture: pageInfo.picture?.data?.url,
        website: pageInfo.website,
        link: pageInfo.link
      }
    });
  } catch (error: any) {
    console.error('Facebook connection error:', error);
    res.status(500).json({
      message: 'Failed to connect Facebook Page',
      error: error.message
    });
  }
});

// Get user's connected Facebook Pages
router.get('/pages', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const connectedPages = user.facebookPages.filter(page => page.connected);

    res.json({
      pages: connectedPages.map(page => ({
        id: page.pageId,
        name: page.pageName,
        connected: page.connected,
        lastSync: page.lastSync,
        lastSyncFormatted: page.lastSync ? new Date(page.lastSync).toLocaleString() : null,
        followersCount: page.followersCount,
        category: page.category,
        facebookUrl: `https://www.facebook.com/${page.pageId}`
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Disconnect Facebook Page
router.delete('/pages/:pageId', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { pageId } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const pageIndex = user.facebookPages.findIndex(
      page => page.pageId === pageId
    );

    if (pageIndex === -1) {
      return res.status(404).json({ message: 'Page not found' });
    }

    user.facebookPages.splice(pageIndex, 1);
    await user.save();

    res.json({ message: 'Facebook Page disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get posts from a connected Facebook Page
router.get('/pages/:pageId/posts', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { pageId } = req.params;
    const { maxResults = 10 } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = user.facebookPages.find(p => p.pageId === pageId && p.connected);
    if (!page) {
      return res.status(404).json({ message: 'Page not found or not connected' });
    }

    const posts = await getPagePosts(pageId, page.pageAccessToken, Number(maxResults));

    res.json({ posts });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get comments from a specific Facebook Post
router.get('/posts/:postId/comments', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { postId } = req.params;
    const { maxResults = 20 } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find if user owns this post (has access to the page that owns it)
    let pageAccessToken: string | null = null;

    for (const page of user.facebookPages) {
      if (page.connected) {
        try {
          // Try to get comments from this post to verify ownership
          const comments = await getPostComments(postId, page.pageAccessToken, 1);
          pageAccessToken = page.pageAccessToken;
          break;
        } catch (error) {
          // Post not from this page, continue checking other pages
          continue;
        }
      }
    }

    if (!pageAccessToken) {
      return res.status(404).json({
        message: 'Post not found in your connected Facebook Pages'
      });
    }

    const comments = await getPostComments(postId, pageAccessToken, Number(maxResults));

    res.json({
      comments: comments.map(comment => ({
        id: comment.id,
        text: comment.message,
        author: comment.from?.name || 'Unknown',
        createdAt: comment.created_time,
        likeCount: comment.like_count,
        canReply: true, // Facebook gives page owners reply permission
        parentId: comment.parent?.id // For threaded comments
      }))
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reply to a Facebook comment
router.post('/reply', auth, subscriptionRequired, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { commentId, postId, replyText, templateId } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!user.canReply()) {
      return res.status(403).json({
        message: 'Reply limit reached for current subscription period'
      });
    }

    // Find the appropriate page access token
    let pageAccessToken: string | null = null;
    let pageName = '';

    for (const page of user.facebookPages) {
      if (page.connected) {
        try {
          // Try to get the parent post/comment to verify access
          await getCommentDetails(commentId, page.pageAccessToken);
          pageAccessToken = page.pageAccessToken;
          pageName = page.pageName;
          break;
        } catch (error) {
          // Comment not accessible from this page
          continue;
        }
      }
    }

    if (!pageAccessToken) {
      return res.status(400).json({
        message: 'No connected Facebook Page has access to this comment'
      });
    }

    // Send reply to Facebook
    const facebookResponse = await replyToComment(commentId, replyText, pageAccessToken);

    // Log the reply
    const replyLog = new ReplyLog({
      user: user._id,
      videoId: postId, // Using postId as content identifier
      channelName: pageName,
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
      platform: 'facebook',
      facebookReplyId: facebookResponse.id,
      metadata: {
        processingTime: Date.now(),
        retryCount: 0
      }
    });

    await replyLog.save();
    await user.incrementUsage();

    res.json({
      message: 'Reply sent successfully',
      replyId: facebookResponse.id,
      logId: replyLog._id
    });
  } catch (error: any) {
    console.error('Facebook reply error:', error);

    // Log failed reply
    if (req.body.commentId) {
      try {
        const replyLog = new ReplyLog({
          user: req.user?._id,
          videoId: req.body.postId,
          originalComment: {
            id: req.body.commentId,
            text: req.body.originalComment || '',
            author: req.body.commentAuthor || '',
            publishedAt: new Date()
          },
          replyContent: req.body.replyText,
          template: req.body.templateId,
          status: 'failed',
          platform: 'facebook',
          error: error.message,
          metadata: {
            processingTime: Date.now(),
            retryCount: 0
          }
        });
        await replyLog.save();
      } catch (logError) {
        console.error('Failed to log Facebook reply error:', logError);
      }
    }

    res.status(500).json({
      message: 'Failed to send reply',
      error: error.message
    });
  }
});

// Get recent Facebook replies
router.get('/replies', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { limit = 5 } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const replies = await ReplyLog.find({ user: user._id, platform: 'facebook' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .select('videoTitle replyContent status createdAt metadata platform');

    res.json({ replies });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;