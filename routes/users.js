const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const User = require('../models/User');
const ReplyLog = require('../models/ReplyLog');
const router = express.Router();

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('subscription')
      .select('-password');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/profile', auth, validateRequest(schemas.updateProfile), async (req, res) => {
  try {
    const updates = req.body;

    if (updates.email && updates.email !== req.user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.emailVerified = false;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('subscription').select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/change-password', auth, validateRequest(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await ReplyLog.getStats(req.user._id, startDate, new Date());

    const totalReplies = await ReplyLog.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startDate }
    });

    const recentReplies = await ReplyLog.find({
      user: req.user._id,
      createdAt: { $gte: startDate }
    })
    .populate('template', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('videoTitle channelName status sentAt replyContent template');

    const subscription = req.user.subscription;
    const remainingReplies = subscription ? subscription.getRemainingReplies(req.user) : 0;

    res.json({
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      totalReplies,
      remainingReplies,
      recentReplies,
      period: days
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/usage', auth, async (req, res) => {
  try {
    const user = req.user;
    const subscription = user.subscription;

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        usage: user.usage,
        limits: { repliesPerMonth: 0 }
      });
    }

    const remainingReplies = subscription.getRemainingReplies(user);

    res.json({
      hasSubscription: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage: user.usage,
      limits: subscription.features,
      remainingReplies
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/account', auth, async (req, res) => {
  try {
    const user = req.user;

    if (user.subscription && user.subscription.status === 'active') {
      return res.status(400).json({
        message: 'Please cancel your subscription before deleting your account'
      });
    }

    await ReplyLog.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const users = await User.find(query)
      .populate('subscription')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
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