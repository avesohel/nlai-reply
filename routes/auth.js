const express = require('express');
const crypto = require('crypto');
const { auth, generateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

router.post('/register', validateRequest(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      name,
      email,
      password,
      emailVerificationToken,
      usage: {
        currentPeriodStart: new Date()
      }
    });

    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;

    await sendEmail({
      to: email,
      subject: 'Verify Your Email',
      template: 'emailVerification',
      data: { name, verificationUrl }
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully. Please verify your email.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('subscription');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        subscription: user.subscription,
        settings: user.settings,
        usage: user.usage
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', validateRequest(schemas.forgotPassword), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If an account exists, a reset email has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'passwordReset',
      data: { name: user.name, resetUrl }
    });

    res.json({ message: 'If an account exists, a reset email has been sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', validateRequest(schemas.resetPassword), async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        role: req.user.role,
        subscription: req.user.subscription,
        settings: req.user.settings,
        usage: req.user.usage,
        youtubeChannels: req.user.youtubeChannels
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/refresh-token', auth, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;