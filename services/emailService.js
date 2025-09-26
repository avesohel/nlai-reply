const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const emailTemplates = {
  welcome: {
    subject: 'Welcome to YouTube Reply Service!',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome ${data.name}!</h2>
        <p>Thank you for signing up for YouTube Reply Service. We're excited to help you manage your YouTube comments more efficiently.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Connect your YouTube channel</li>
          <li>Create reply templates</li>
          <li>Start automating your responses</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  emailVerification: {
    subject: 'Verify Your Email Address',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hi ${data.name},</p>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  passwordReset: {
    subject: 'Password Reset Request',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${data.name},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  subscriptionConfirmation: {
    subject: 'Subscription Confirmed!',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Subscription Confirmed!</h2>
        <p>Hi ${data.name},</p>
        <p>Your ${data.plan} subscription has been confirmed. You now have access to:</p>
        <ul>
          <li>${data.features.repliesPerMonth} replies per month</li>
          <li>Up to ${data.features.channels} YouTube channels</li>
          ${data.features.prioritySupport ? '<li>Priority support</li>' : ''}
          ${data.features.analytics ? '<li>Advanced analytics</li>' : ''}
          ${data.features.customTemplates ? '<li>Custom reply templates</li>' : ''}
        </ul>
        <p>Your subscription will renew on ${data.renewalDate}.</p>
        <p>Start managing your YouTube comments more efficiently today!</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  subscriptionCanceled: {
    subject: 'Subscription Canceled',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Subscription Canceled</h2>
        <p>Hi ${data.name},</p>
        <p>Your subscription has been canceled and will end on ${data.endDate}. You'll continue to have access to all features until then.</p>
        <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime from your dashboard.</p>
        <p>If you have any feedback on how we can improve, we'd love to hear from you.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  paymentFailed: {
    subject: 'Payment Failed - Action Required',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Payment Failed</h2>
        <p>Hi ${data.name},</p>
        <p>We were unable to process your payment for your YouTube Reply Service subscription.</p>
        <p>Please update your payment method to avoid any interruption to your service:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.updatePaymentUrl}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Payment Method</a>
        </div>
        <p>If you don't update your payment method, your subscription will be paused.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  },

  usageLimitWarning: {
    subject: 'Usage Limit Warning',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">Usage Limit Warning</h2>
        <p>Hi ${data.name},</p>
        <p>You've used ${data.usedReplies} out of ${data.totalReplies} replies for this month (${Math.round((data.usedReplies / data.totalReplies) * 100)}%).</p>
        <p>To avoid running out of replies, consider upgrading your subscription:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.upgradeUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Upgrade Now</a>
        </div>
        <p>Your usage resets on ${data.resetDate}.</p>
        <p>Best regards,<br>YouTube Reply Service Team</p>
      </div>
    `
  }
};

const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    let emailContent = {};

    if (template && emailTemplates[template]) {
      emailContent.subject = subject || emailTemplates[template].subject;
      emailContent.html = emailTemplates[template].html(data || {});
    } else {
      emailContent.subject = subject;
      emailContent.html = html;
      emailContent.text = text;
    }

    const mailOptions = {
      from: `"YouTube Reply Service" <${process.env.SMTP_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

const sendBulkEmail = async (emails) => {
  const results = [];

  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ success: true, messageId: result.messageId, to: email.to });
    } catch (error) {
      results.push({ success: false, error: error.message, to: email.to });
    }
  }

  return results;
};

const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('SMTP server connection verified');
    return true;
  } catch (error) {
    console.error('SMTP server connection failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  verifyConnection,
  emailTemplates
};