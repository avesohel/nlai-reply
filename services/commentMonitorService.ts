import User from '../models/User';
import ReplyLog from '../models/ReplyLog';
import AISettings from '../models/AISettings';
import { getChannelVideos, getVideoComments, replyToComment, refreshAccessToken } from './youtubeService';
import aiReplyService from './aiReplyService';

interface MonitorResult {
  processed: number;
  replies: number;
}

class CommentMonitorService {
  private isRunning: boolean = false;

  async monitorAllUsers(): Promise<void> {
    if (this.isRunning) {
      console.log('Comment monitoring already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔍 Starting comment monitoring for all users...');

    try {
      // Get all active users with connected YouTube channels
      const users = await User.find({
        'youtubeChannels.connected': true,
        isActive: true,
        $or: [
          { subscription: { $exists: true } },
          { role: 'admin' }
        ]
      }).populate('subscription');

      let totalProcessed = 0;
      let totalReplies = 0;

      for (const user of users) {
        try {
          const result = await this.monitorUserComments(user);
          totalProcessed += result.processed;
          totalReplies += result.replies;
        } catch (error) {
          console.error(`Error monitoring comments for user ${user.email}:`, error);
        }
      }

      console.log(`✅ Comment monitoring completed. Processed: ${totalProcessed}, Replied: ${totalReplies}`);
    } catch (error) {
      console.error('❌ Error during comment monitoring:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async monitorUserComments(user: any): Promise<MonitorResult> {
    console.log(`Monitoring comments for user: ${user.email}`);

    let processed = 0;
    let replies = 0;

    // Get user's AI settings
    const aiSettings = await AISettings.findOne({ user: user._id });
    if (!aiSettings || !aiSettings.isEnabled || !aiSettings.automaticReplies?.enabled) {
      console.log(`Automatic AI replies disabled for user ${user.email}, skipping...`);
      return { processed: 0, replies: 0 };
    }

    // Check if user has available replies (admin users bypass this check)
    if (user.role !== 'admin' && !user.canReply()) {
      console.log(`User ${user.email} has no available replies, skipping...`);
      return { processed: 0, replies: 0 };
    }

    // Process each connected YouTube channel
    for (const channel of user.youtubeChannels) {
      if (!channel.connected || !channel.accessToken) continue;

      try {
        // Get recent videos from the channel (last 24 hours)
        const videos = await getChannelVideos(channel.channelId, channel.accessToken, 10);

        for (const video of videos) {
          // Only check videos published in the last 7 days
          const videoDate = new Date(video.snippet.publishedAt);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

          if (videoDate < sevenDaysAgo) continue;

          try {
            // Get comments for this video
            const comments = await getVideoComments(video.id.videoId, channel.accessToken, 50);

            for (const comment of comments) {
              processed++;

              // Check if we already replied to this comment
              const existingReply = await ReplyLog.findOne({
                commentId: comment.id,
                user: user._id
              });

              if (existingReply) continue;

              // Check if comment is recent (within last 24 hours)
              const commentDate = new Date(comment.publishedAt);
              const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

              if (commentDate < twentyFourHoursAgo) continue;

              // Skip comments from the channel owner
              if (comment.authorChannelId === channel.channelId) continue;

              // Check if user has available replies (admin users bypass this check)
              if (user.role !== 'admin' && !user.canReply()) {
                console.log(`User ${user.email} reached reply limit, stopping...`);
                return { processed, replies };
              }

              try {
                // Generate AI reply
                const replyResult = await aiReplyService.generateIntelligentReply(
                  comment,
                  video.id.videoId,
                  user._id,
                  {
                    saveToLog: true,
                    useTemplate: true
                  }
                );

                if (replyResult.success && replyResult.reply) {
                  // Post the reply to YouTube
                  await replyToComment(
                    comment.id,
                    replyResult.reply,
                    channel.accessToken
                  );

                  // Update user usage
                  user.usage.currentPeriodReplies += 1;
                  user.usage.repliesSent += 1;
                  await user.save();

                  // Log the successful reply
                  await ReplyLog.create({
                    user: user._id,
                    channelId: channel.channelId,
                    videoId: video.id.videoId,
                    commentId: comment.id,
                    commentText: comment.text,
                    replyText: replyResult.reply,
                    status: 'sent',
                    aiGenerated: true,
                    metadata: {
                      commentAuthor: comment.author,
                      videoTitle: video.snippet.title,
                      autoGenerated: true
                    }
                  });

                  replies++;
                  console.log(`✅ Auto-replied to comment by ${comment.author} on video "${video.snippet.title}"`);

                  // Add delay between replies to avoid rate limiting
                  await this.sleep(aiSettings.automaticReplies?.delayBetweenReplies || 30000);
                } else {
                  console.log(`❌ Failed to generate reply for comment by ${comment.author}: ${replyResult.error}`);
                }
              } catch (replyError: any) {
                console.error(`Error generating/posting reply for comment ${comment.id}:`, replyError);

                // Log failed reply attempt
                await ReplyLog.create({
                  user: user._id,
                  channelId: channel.channelId,
                  videoId: video.id.videoId,
                  commentId: comment.id,
                  commentText: comment.text,
                  status: 'failed',
                  aiGenerated: true,
                  error: replyError.message,
                  metadata: {
                    commentAuthor: comment.author,
                    videoTitle: video.snippet.title,
                    autoGenerated: true
                  }
                });
              }
            }
          } catch (videoError) {
            console.error(`Error processing video ${video.id.videoId}:`, videoError);
          }
        }
      } catch (channelError: any) {
        console.error(`Error processing channel ${channel.channelId}:`, channelError);

        // If access token expired, try to refresh
        if (channelError.code === 401 && channel.refreshToken) {
          try {
            console.log(`Refreshing access token for channel ${channel.channelId}`);
            const newTokens = await refreshAccessToken(channel.refreshToken);

            // Update the channel with new tokens
            const channelIndex = user.youtubeChannels.findIndex((ch: any) => ch.channelId === channel.channelId);
            if (channelIndex >= 0) {
              user.youtubeChannels[channelIndex].accessToken = newTokens.access_token;
              if (newTokens.refresh_token) {
                user.youtubeChannels[channelIndex].refreshToken = newTokens.refresh_token;
              }
              await user.save();
              console.log(`✅ Refreshed access token for channel ${channel.channelId}`);
            }
          } catch (refreshError) {
            console.error(`Failed to refresh token for channel ${channel.channelId}:`, refreshError);
          }
        }
      }
    }

    console.log(`User ${user.email}: processed ${processed} comments, sent ${replies} replies`);
    return { processed, replies };
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new CommentMonitorService();