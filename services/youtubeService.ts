import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const youtube = google.youtube('v3');

export const getAuthUrl = (): string => {
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

export const getTokens = async (code: string): Promise<any> => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const refreshAccessToken = async (refreshToken: string): Promise<any> => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};

export const getChannelInfo = async (accessToken: string): Promise<any> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.channels.list({
    auth: oauth2Client,
    part: 'snippet,statistics',
    mine: true
  } as any);

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('No channel found for this user');
  }

  return response.data.items[0];
};

export const getChannelVideos = async (
  channelId: string,
  accessToken: string,
  maxResults: number = 10
): Promise<any[]> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.search.list({
    auth: oauth2Client,
    part: 'snippet',
    channelId: channelId,
    type: 'video',
    order: 'date',
    maxResults: maxResults
  } as any);

  return response.data.items || [];
};

export const getVideoComments = async (
  videoId: string,
  accessToken: string,
  maxResults: number = 20
): Promise<any[]> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const response = await youtube.commentThreads.list({
      auth: oauth2Client,
      part: 'snippet',
      videoId: videoId,
      maxResults: maxResults,
      order: 'time'
    } as any);

    return response.data.items || [];
  } catch (error: any) {
    if (error.code === 403 && error.message.includes('disabled')) {
      throw new Error('Comments are disabled for this video');
    }
    throw error;
  }
};

export const replyToComment = async (
  parentId: string,
  textOriginal: string,
  accessToken: string
): Promise<any> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.comments.insert({
    auth: oauth2Client,
    part: 'snippet',
    requestBody: {
      snippet: {
        parentId: parentId,
        textOriginal: textOriginal
      }
    }
  } as any);

  return response.data;
};

export const getVideoDetails = async (
  videoId: string,
  accessToken: string
): Promise<any> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.videos.list({
    auth: oauth2Client,
    part: 'snippet,statistics',
    id: videoId
  } as any);

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('Video not found');
  }

  return response.data.items[0];
};

export const searchChannelVideos = async (
  channelId: string,
  query: string,
  accessToken: string,
  maxResults: number = 10
): Promise<any[]> => {
  oauth2Client.setCredentials({ access_token: accessToken });

  const response = await youtube.search.list({
    auth: oauth2Client,
    part: 'snippet',
    channelId: channelId,
    q: query,
    type: 'video',
    maxResults: maxResults
  } as any);

  return response.data.items || [];
};

export default {
  getAuthUrl,
  getTokens,
  refreshAccessToken,
  getChannelInfo,
  getChannelVideos,
  getVideoComments,
  replyToComment,
  getVideoDetails,
  searchChannelVideos
};