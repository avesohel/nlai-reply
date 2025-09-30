import express, { Request, Response } from 'express';
import { auth, adminAuth } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import User from '../models/User';

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id)
      .populate('subscription')
      .select('-password');

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', auth, validateRequest(schemas.updateProfile), async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Check if email is being changed and not already in use
    if (updates.email && updates.email !== req.user?.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.emailVerified = false;
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      updates,
      { new: true, runValidators: true }
    ).populate('subscription').select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', auth, validateRequest(schemas.changePassword), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get user statistics
router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).populate('subscription');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stats = {
      totalReplies: user.usage.repliesSent,
      currentPeriodReplies: user.usage.currentPeriodReplies,
      replyLimit: user.getReplyLimit(),
      canReply: user.canReply(),
      subscription: user.subscription ? {
        plan: (user.subscription as any).plan,
        status: (user.subscription as any).status,
        isActive: (user.subscription as any).isActive()
      } : null
    };

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user account
router.delete('/account', auth, async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { isActive: false });
    res.json({ message: 'Account deactivated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
router.get('/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .populate('subscription')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/admin/users/:id/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;