import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI!;

// Facebook Graph API base URL
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export const getFacebookAuthUrl = (): string => {
  const scopes = [
    'email',                        // Email address
    'public_profile',               // Public profile info
    'pages_read_engagement',        // Read page posts and comments
    'pages_manage_posts',           // Manage page posts and comments
    'pages_show_list'               // Access user's pages
  ].join(',');

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code`;

  return authUrl;
};

export const getFacebookTokens = async (code: string): Promise<any> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        code: code
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Facebook token exchange error:', error.response?.data || error.message);
    throw new Error(`Failed to get Facebook tokens: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const refreshFacebookToken = async (userAccessToken: string): Promise<any> => {
  try {
    // Facebook long-lived tokens are valid for 60 days, no refresh endpoint like Google
    // We'll get a new long-lived token when needed
    const response = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: userAccessToken
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Facebook token refresh error:', error.response?.data || error.message);
    // Facebook tokens don't expire like Google tokens, but we handle this gracefully
    return { access_token: userAccessToken };
  }
};

export const getUserPages = async (accessToken: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,access_token,category,tasks'
      }
    });

    return response.data.data || [];
  } catch (error: any) {
    console.error('Get user pages error:', error.response?.data || error.message);
    throw new Error(`Failed to get Facebook pages: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const getPageInfo = async (pageId: string, pageAccessToken: string): Promise<any> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,name,about,category,website,fan_count,followers_count,link'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Get page info error:', error.response?.data || error.message);
    throw new Error(`Failed to get page info: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const getPagePosts = async (
  pageId: string,
  pageAccessToken: string,
  limit: number = 10
): Promise<any[]> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/${pageId}/posts`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,message,story,full_picture,type,created_time,likes.summary(true),comments.summary(true)',
        limit: limit
      }
    });

    return response.data.data || [];
  } catch (error: any) {
    console.error('Get page posts error:', error.response?.data || error.message);
    throw new Error(`Failed to get page posts: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const getPostComments = async (
  postId: string,
  pageAccessToken: string,
  limit: number = 20
): Promise<any[]> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/${postId}/comments`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,message,from{name,id},created_time,like_count,can_comment,parent{from,message}',
        limit: limit,
        order: 'chronological'
      }
    });

    return response.data.data || [];
  } catch (error: any) {
    console.error('Get post comments error:', error.response?.data || error.message);
    if (error.response?.data?.error?.code === 100) {
      throw new Error('Comments are not available for this post');
    }
    throw new Error(`Failed to get post comments: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const replyToComment = async (
  commentId: string,
  replyText: string,
  pageAccessToken: string
): Promise<any> => {
  try {
    const response = await axios.post(`${GRAPH_API_BASE}/${commentId}/comments`, null, {
      params: {
        message: replyText,
        access_token: pageAccessToken
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Reply to comment error:', error.response?.data || error.message);
    throw new Error(`Failed to reply to comment: ${error.response?.data?.error?.message || error.message}`);
  }
};

export const getCommentDetails = async (
  commentId: string,
  pageAccessToken: string
): Promise<any> => {
  try {
    const response = await axios.get(`${GRAPH_API_BASE}/${commentId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'id,message,from{name,id},created_time,parent{id}'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Get comment details error:', error.response?.data || error.message);
    throw new Error(`Failed to get comment details: ${error.response?.data?.error?.message || error.message}`);
  }
};

export default {
  getFacebookAuthUrl,
  getFacebookTokens,
  refreshFacebookToken,
  getUserPages,
  getPageInfo,
  getPagePosts,
  getPostComments,
  replyToComment,
  getCommentDetails
};