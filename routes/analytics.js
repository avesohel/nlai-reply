const express = require('express');
const { auth } = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const ReplyTemplate = require('../models/ReplyTemplate');
const router = express.Router();

// Get dashboard overview stats
router.get('/overview', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id;

    // Get basic user stats
    const user = await User.findById(userId);

    // Get analytics stats
    const userStats = await Analytics.getUserStats(userId, parseInt(period));

    // Get current period dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();

    // Get total counts from database
    const totalReplies = await Analytics.countDocuments({
      user: userId,
      type: 'reply_sent',
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const totalTemplateUsage = await Analytics.countDocuments({
      user: userId,
      type: 'template_used',
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Calculate engagement metrics
    const engagementData = await Analytics.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: startDate, $lte: endDate },
          type: { $in: ['reply_sent', 'reply_engagement'] }
        }
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$data.engagement.likes' },
          totalReplies: { $sum: '$data.engagement.replies' },
          avgResponseTime: { $avg: '$data.metadata.responseTime' }
        }
      }
    ]);

    const engagement = engagementData[0] || { totalLikes: 0, totalReplies: 0, avgResponseTime: 0 };

    // Get top performing templates
    const topTemplates = await Analytics.getTemplatePerformance(userId, parseInt(period));

    // Calculate growth from previous period
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period));

    const previousPeriodReplies = await Analytics.countDocuments({
      user: userId,
      type: 'reply_sent',
      timestamp: { $gte: previousPeriodStart, $lte: startDate }
    });

    const growth = previousPeriodReplies > 0
      ? ((totalReplies - previousPeriodReplies) / previousPeriodReplies * 100).toFixed(1)
      : 0;

    res.json({
      period: parseInt(period),
      dateRange: { start: startDate, end: endDate },
      overview: {
        totalReplies,
        totalEngagement: engagement.totalLikes + engagement.totalReplies,
        templatesUsed: totalTemplateUsage,
        avgResponseTime: Math.round(engagement.avgResponseTime || 0),
        growth: parseFloat(growth),
        currentPeriodUsage: user.usage.currentPeriodReplies,
        usageLimit: user.getReplyLimit ? user.getReplyLimit() : 0
      },
      topTemplates: topTemplates.slice(0, 5),
      engagement: {
        likes: engagement.totalLikes,
        replies: engagement.totalReplies,
        total: engagement.totalLikes + engagement.totalReplies
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get time series data for charts
router.get('/timeseries', auth, async (req, res) => {
  try {
    const { period = 30, granularity = 'day' } = req.query;
    const userId = req.user._id;

    const timeSeriesData = await Analytics.getTimeSeriesData(
      userId,
      parseInt(period),
      granularity
    );

    res.json(timeSeriesData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get template performance details
router.get('/templates', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id;

    const templatePerformance = await Analytics.getTemplatePerformance(userId, parseInt(period));

    res.json(templatePerformance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get channel statistics
router.get('/channels', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id;

    const channelStats = await Analytics.getChannelStats(userId, parseInt(period));

    // Enrich with channel names from user data
    const user = await User.findById(userId);
    const channelMap = {};

    if (user.youtubeChannels) {
      user.youtubeChannels.forEach(channel => {
        channelMap[channel.channelId] = channel.channelName;
      });
    }

    const enrichedStats = channelStats.map(stat => ({
      ...stat,
      channelName: channelMap[stat.channelId] || `Channel ${stat.channelId.substring(0, 8)}...`
    }));

    res.json(enrichedStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sentiment analysis
router.get('/sentiment', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const sentimentData = await Analytics.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: startDate },
          'data.sentiment': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$data.sentiment',
          count: { $sum: 1 },
          avgEngagement: {
            $avg: {
              $add: [
                { $ifNull: ['$data.engagement.likes', 0] },
                { $ifNull: ['$data.engagement.replies', 0] }
              ]
            }
          }
        }
      }
    ]);

    const sentiment = {
      positive: 0,
      negative: 0,
      neutral: 0
    };

    sentimentData.forEach(item => {
      sentiment[item._id] = {
        count: item.count,
        avgEngagement: Math.round(item.avgEngagement || 0)
      };
    });

    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get engagement trends
router.get('/engagement', auth, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const engagementTrends = await Analytics.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: startDate },
          type: { $in: ['reply_sent', 'reply_engagement'] }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          },
          likes: { $sum: '$data.engagement.likes' },
          replies: { $sum: '$data.engagement.replies' },
          totalReplies: {
            $sum: {
              $cond: [{ $eq: ['$type', 'reply_sent'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id.date',
          likes: 1,
          replies: 1,
          totalReplies: 1,
          engagementRate: {
            $cond: [
              { $gt: ['$totalReplies', 0] },
              { $divide: [{ $add: ['$likes', '$replies'] }, '$totalReplies'] },
              0
            ]
          }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json(engagementTrends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record new analytics event
router.post('/track', auth, async (req, res) => {
  try {
    const { type, data } = req.body;
    const userId = req.user._id;

    const analytics = new Analytics({
      user: userId,
      type,
      data
    });

    await analytics.save();
    res.status(201).json({ message: 'Analytics event tracked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;