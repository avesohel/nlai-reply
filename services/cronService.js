const cron = require('cron');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const ReplyLog = require('../models/ReplyLog');
const { sendEmail } = require('./emailService');
const commentMonitorService = require('./commentMonitorService');

const jobs = [];

const startCronJobs = () => {
  console.log('Starting cron jobs...');

  // Comment monitoring job - runs every 15 minutes
  const commentMonitorJob = new cron.CronJob(
    '*/15 * * * *',
    () => commentMonitorService.monitorAllUsers(),
    null,
    true,
    'UTC'
  );

  const usageWarningJob = new cron.CronJob(
    '0 9 * * *',
    checkUsageLimits,
    null,
    true,
    'UTC'
  );

  const subscriptionRenewalJob = new cron.CronJob(
    '0 10 * * *',
    checkSubscriptionRenewals,
    null,
    true,
    'UTC'
  );

  const cleanupJob = new cron.CronJob(
    '0 2 * * 0',
    cleanupOldLogs,
    null,
    true,
    'UTC'
  );

  const analyticsJob = new cron.CronJob(
    '0 0 1 * *',
    generateMonthlyReports,
    null,
    true,
    'UTC'
  );

  jobs.push(commentMonitorJob, usageWarningJob, subscriptionRenewalJob, cleanupJob, analyticsJob);

  console.log(`✅ Started ${jobs.length} cron jobs`);
};

const checkUsageLimits = async () => {
  try {
    console.log('Checking usage limits...');

    const users = await User.find({
      subscription: { $exists: true },
      isActive: true
    }).populate('subscription');

    for (const user of users) {
      if (!user.subscription || !user.subscription.isActive()) continue;

      const usagePercentage = (user.usage.currentPeriodReplies || 0) / user.subscription.features.repliesPerMonth;

      if (usagePercentage >= 0.8 && usagePercentage < 1.0) {
        await sendUsageWarning(user, usagePercentage);
      }
    }

    console.log(`Checked usage limits for ${users.length} users`);
  } catch (error) {
    console.error('Error checking usage limits:', error);
  }
};

const sendUsageWarning = async (user, usagePercentage) => {
  try {
    const totalReplies = user.subscription.features.repliesPerMonth;
    const usedReplies = user.usage.currentPeriodReplies || 0;
    const resetDate = new Date(user.subscription.currentPeriodEnd);

    await sendEmail({
      to: user.email,
      template: 'usageLimitWarning',
      data: {
        name: user.name,
        usedReplies,
        totalReplies,
        resetDate: resetDate.toLocaleDateString(),
        upgradeUrl: `${process.env.CLIENT_URL}/subscription/upgrade`
      }
    });

    console.log(`Usage warning sent to ${user.email} (${Math.round(usagePercentage * 100)}% used)`);
  } catch (error) {
    console.error(`Error sending usage warning to ${user.email}:`, error);
  }
};

const checkSubscriptionRenewals = async () => {
  try {
    console.log('Checking subscription renewals...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const subscriptions = await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lte: threeDaysFromNow },
      cancelAtPeriodEnd: false
    }).populate('user');

    for (const subscription of subscriptions) {
      await sendRenewalReminder(subscription.user, subscription);
    }

    console.log(`Checked renewals for ${subscriptions.length} subscriptions`);
  } catch (error) {
    console.error('Error checking subscription renewals:', error);
  }
};

const sendRenewalReminder = async (user, subscription) => {
  try {
    const renewalDate = new Date(subscription.currentPeriodEnd);

    await sendEmail({
      to: user.email,
      subject: 'Your subscription renews soon',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Subscription Renewal Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>Your ${subscription.plan} subscription will renew on ${renewalDate.toLocaleDateString()}.</p>
          <p>Your subscription will automatically renew unless you cancel it before the renewal date.</p>
          <p>Manage your subscription: <a href="${process.env.CLIENT_URL}/subscription">Subscription Settings</a></p>
          <p>Best regards,<br>YouTube Reply Service Team</p>
        </div>
      `
    });

    console.log(`Renewal reminder sent to ${user.email}`);
  } catch (error) {
    console.error(`Error sending renewal reminder to ${user.email}:`, error);
  }
};

const cleanupOldLogs = async () => {
  try {
    console.log('Cleaning up old logs...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await ReplyLog.deleteMany({
      createdAt: { $lt: sixMonthsAgo }
    });

    console.log(`Deleted ${result.deletedCount} old reply logs`);
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
  }
};

const generateMonthlyReports = async () => {
  try {
    console.log('Generating monthly reports...');

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const totalReplies = await ReplyLog.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'sent'
    });

    const activeUsers = await User.countDocuments({
      subscription: { $exists: true },
      isActive: true
    });

    const totalRevenue = await Subscription.aggregate([
      {
        $match: {
          status: 'active',
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.amount' }
        }
      }
    ]);

    console.log(`Monthly Report (${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}):
      - Total replies sent: ${totalReplies}
      - Active users: ${activeUsers}
      - Revenue: $${totalRevenue[0]?.total || 0}`);
  } catch (error) {
    console.error('Error generating monthly reports:', error);
  }
};

const stopCronJobs = () => {
  jobs.forEach(job => job.stop());
  jobs.length = 0;
  console.log('All cron jobs stopped');
};

const getJobStatus = () => {
  return jobs.map(job => ({
    running: job.running,
    lastDate: job.lastDate(),
    nextDate: job.nextDate()
  }));
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  getJobStatus,
  checkUsageLimits,
  checkSubscriptionRenewals,
  cleanupOldLogs,
  generateMonthlyReports,
  monitorComments: () => commentMonitorService.monitorAllUsers()
};