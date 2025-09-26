const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const youtube = google.youtube('v3');

const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

const refreshAccessToken = async (refreshToken) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};

const getChannelInfo = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.channels.list({
    auth: oauth2Client,
    part: 'snippet,statistics',
    mine: true
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('No channel found for this user');
  }

  return response.data.items[0];
};

const getChannelVideos = async (channelId, accessToken, maxResults = 10) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.search.list({
    auth: oauth2Client,
    part: 'snippet',
    channelId: channelId,
    type: 'video',
    order: 'date',
    maxResults: maxResults
  });

  return response.data.items;
};

const getVideoComments = async (videoId, accessToken, maxResults = 10) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const response = await youtube.commentThreads.list({
      auth: oauth2Client,
      part: 'snippet,replies',
      videoId: videoId,
      maxResults: maxResults,
      order: 'time'
    });

    const comments = response.data.items.map(item => {
      const comment = item.snippet.topLevelComment.snippet;
      return {
        id: item.snippet.topLevelComment.id,
        threadId: item.id,
        text: comment.textDisplay,
        author: comment.authorDisplayName,
        authorChannelId: comment.authorChannelId?.value,
        authorProfileImageUrl: comment.authorProfileImageUrl,
        likeCount: comment.likeCount,
        publishedAt: comment.publishedAt,
        updatedAt: comment.updatedAt,
        canReply: comment.canReply,
        totalReplyCount: item.snippet.totalReplyCount,
        replies: item.replies ? item.replies.comments.map(reply => ({
          id: reply.id,
          text: reply.snippet.textDisplay,
          author: reply.snippet.authorDisplayName,
          likeCount: reply.snippet.likeCount,
          publishedAt: reply.snippet.publishedAt
        })) : []
      };
    });

    return comments;
  } catch (error) {
    if (error.code === 403 && error.message.includes('disabled comments')) {
      throw new Error('Comments are disabled for this video');
    }
    throw error;
  }
};

const replyToComment = async (commentId, replyText, accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.comments.insert({
    auth: oauth2Client,
    part: 'snippet',
    requestBody: {
      snippet: {
        parentId: commentId,
        textOriginal: replyText
      }
    }
  });

  return response.data;
};

const getVideoDetails = async (videoId, accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.videos.list({
    auth: oauth2Client,
    part: 'snippet,statistics',
    id: videoId
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('Video not found');
  }

  return response.data.items[0];
};

const searchVideos = async (query, accessToken, maxResults = 10) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.search.list({
    auth: oauth2Client,
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults,
    order: 'relevance'
  });

  return response.data.items;
};

const getCommentReplies = async (commentId, accessToken, maxResults = 10) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.comments.list({
    auth: oauth2Client,
    part: 'snippet',
    parentId: commentId,
    maxResults: maxResults
  });

  return response.data.items.map(item => ({
    id: item.id,
    text: item.snippet.textDisplay,
    author: item.snippet.authorDisplayName,
    authorChannelId: item.snippet.authorChannelId?.value,
    likeCount: item.snippet.likeCount,
    publishedAt: item.snippet.publishedAt
  }));
};

const updateComment = async (commentId, newText, accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.comments.update({
    auth: oauth2Client,
    part: 'snippet',
    requestBody: {
      id: commentId,
      snippet: {
        textOriginal: newText
      }
    }
  });

  return response.data;
};

const deleteComment = async (commentId, accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  await youtube.comments.delete({
    auth: oauth2Client,
    id: commentId
  });

  return { success: true };
};

const moderateComment = async (commentId, moderationStatus, accessToken) => {
  oauth2Client.setCredentials({ access_token: accessToken });

  await youtube.comments.setModerationStatus({
    auth: oauth2Client,
    id: commentId,
    moderationStatus: moderationStatus // 'heldForReview', 'published', 'rejected'
  });

  return { success: true };
};

module.exports = {
  getAuthUrl,
  getTokens,
  refreshAccessToken,
  getChannelInfo,
  getChannelVideos,
  getVideoComments,
  replyToComment,
  getVideoDetails,
  searchVideos,
  getCommentReplies,
  updateComment,
  deleteComment,
  moderateComment
};