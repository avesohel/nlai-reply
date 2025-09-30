import nodemailer from 'nodemailer';

export interface EmailData {
  name?: string;
  email?: string;
  verificationUrl?: string;
  resetUrl?: string;
  [key: string]: any;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: EmailData;
}

export interface EmailTemplate {
  subject: string;
  html: (data: EmailData) => string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT!) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates
const emailTemplates: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to NL AI Reply Service!',
    html: (data: EmailData) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome ${data.name}!</h2>
        <p>Thank you for signing up for NL AI Reply Service. We're excited to help you manage your YouTube comments more efficiently.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Connect your YouTube channel</li>
          <li>Create reply templates</li>
          <li>Start automating your responses</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>NL AI Reply Service Team</p>
      </div>
    `
  },

  emailVerification: {
    subject: 'Verify Your Email Address',
    html: (data: EmailData) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hi ${data.name},</p>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${data.verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>NL AI Reply Service Team</p>
      </div>
    `
  },

  passwordReset: {
    subject: 'Reset Your Password',
    html: (data: EmailData) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hi ${data.name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${data.resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <p>Best regards,<br>NL AI Reply Service Team</p>
      </div>
    `
  },

  subscriptionConfirmation: {
    subject: 'Subscription Confirmed!',
    html: (data: EmailData) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Subscription Confirmed!</h2>
        <p>Hi ${data.name},</p>
        <p>Your subscription to the <strong>${data.plan}</strong> plan has been confirmed!</p>
        <p>You now have access to:</p>
        <ul>
          <li>AI-powered reply generation</li>
          <li>YouTube channel integration</li>
          <li>Advanced analytics</li>
          <li>Custom reply templates</li>
        </ul>
        <p>Start managing your YouTube comments more efficiently today!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
        </div>
        <p>Best regards,<br>NL AI Reply Service Team</p>
      </div>
    `
  }
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const template = emailTemplates[options.template];
    if (!template) {
      throw new Error(`Email template '${options.template}' not found`);
    }

    const mailOptions = {
      from: `"NL AI Reply Service" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: template.subject,
      html: template.html(options.data),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
  } catch (error: any) {
    console.error('📧 Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('📧 Email configuration verified');
    return true;
  } catch (error: any) {
    console.error('📧 Email configuration error:', error);
    return false;
  }
};

export default {
  sendEmail,
  verifyEmailConfig,
  templates: emailTemplates,
};