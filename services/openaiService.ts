import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder-for-development',
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS!) || 150;

// Interfaces
export interface CommentData {
  text: string;
  author?: string;
  timestamp?: string;
  likes?: number;
  sentiment?: number;
}

export interface VideoContext {
  title?: string;
  description?: string;
  transcript?: string;
  channelName?: string;
  tags?: string[];
}

export interface UserSettings {
  tone?: string;
  length?: string;
  personality?: {
    enthusiasmLevel?: number;
    formalityLevel?: number;
    humorLevel?: number;
    helpfulnessLevel?: number;
  };
  instructions?: string;
  channelSpecific?: any;
  aiModel?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ReplyResponse {
  reply: string;
  success?: boolean;
  fallbackReply?: string;
  confidence: number;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    responseTime?: number;
  };
}

export const countTokens = (text: string, model: string = DEFAULT_MODEL): number => {
  try {
    // Simple token estimation - 4 characters per token on average
    return Math.ceil(text.length / 4);
  } catch (error) {
    return Math.ceil(text.length / 4);
  }
};

export const truncateText = (text: string, maxTokens: number, model: string = DEFAULT_MODEL): string => {
  const tokens = countTokens(text, model);
  if (tokens <= maxTokens) return text;

  const ratio = maxTokens / tokens;
  return text.substring(0, Math.floor(text.length * ratio * 0.9));
};

export const generateReply = async (
  commentData: CommentData,
  videoContext: VideoContext = {},
  userSettings: UserSettings = {}
): Promise<ReplyResponse> => {
  const startTime = Date.now();

  try {
    const {
      tone = 'friendly',
      length = 'medium',
      personality = {},
      instructions = 'Be helpful and engaging',
      channelSpecific = null
    } = userSettings;

    const model = userSettings.aiModel || DEFAULT_MODEL;
    const maxTokens = userSettings.maxTokens || MAX_TOKENS;
    const temperature = userSettings.temperature || 0.7;

    // Build context prompt
    let contextPrompt = `You are a helpful YouTube comment responder. Your task is to generate an appropriate reply to a comment.

TONE: ${tone}
LENGTH: ${length}
INSTRUCTIONS: ${instructions}

`;

    // Add personality traits
    if (personality.enthusiasmLevel) {
      contextPrompt += `Enthusiasm Level: ${personality.enthusiasmLevel}/10\n`;
    }
    if (personality.formalityLevel) {
      contextPrompt += `Formality Level: ${personality.formalityLevel}/10\n`;
    }
    if (personality.humorLevel) {
      contextPrompt += `Humor Level: ${personality.humorLevel}/10\n`;
    }

    // Add video context if available
    if (videoContext.title) {
      contextPrompt += `\nVideo Title: ${videoContext.title}`;
    }
    if (videoContext.description) {
      const truncatedDesc = truncateText(videoContext.description, 200);
      contextPrompt += `\nVideo Description: ${truncatedDesc}`;
    }
    if (videoContext.transcript) {
      const truncatedTranscript = truncateText(videoContext.transcript, 500);
      contextPrompt += `\nVideo Transcript (excerpt): ${truncatedTranscript}`;
    }

    // Add channel-specific instructions
    if (channelSpecific?.customInstructions) {
      contextPrompt += `\nChannel-specific instructions: ${channelSpecific.customInstructions}`;
    }

    contextPrompt += `\n\nOriginal Comment: "${commentData.text}"

Please generate a ${length} ${tone} reply that is helpful and engaging. Do not include hashtags or promotional content.`;

    // Generate reply using OpenAI
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates appropriate YouTube comment replies.'
        },
        {
          role: 'user',
          content: contextPrompt
        }
      ],
      max_tokens: maxTokens,
      temperature,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const reply = response.choices[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('No reply generated');
    }

    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      reply,
      success: true,
      confidence: 0.85, // Placeholder confidence score
      metadata: {
        model,
        tokensUsed,
        processingTime,
        responseTime: processingTime
      }
    };

  } catch (error: any) {
    console.error('OpenAI service error:', error);
    throw new Error(`Failed to generate reply: ${error.message}`);
  }
};

export const validateReply = (reply: string): boolean => {
  if (!reply || reply.length < 5) return false;
  if (reply.length > 1000) return false;

  // Check for inappropriate content patterns
  const inappropriatePatterns = [
    /\b(spam|scam|click here|subscribe now)\b/i,
    /https?:\/\/[^\s]+/g, // URLs
    /@[\w]+/g, // Mentions
    /#[\w]+/g  // Hashtags
  ];

  return !inappropriatePatterns.some(pattern => pattern.test(reply));
};

export const analyzeCommentIntent = async (commentText: string): Promise<any> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze this YouTube comment for intent, sentiment, and characteristics. Return JSON with hasQuestion, sentiment (positive/negative/neutral), isSpam, category, and keywords.'
        },
        {
          role: 'user',
          content: commentText
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content?.trim();

    return {
      success: true,
      analysis: {
        hasQuestion: commentText.includes('?'),
        sentiment: 'neutral',
        isSpam: false,
        category: 'general',
        keywords: []
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      analysis: {
        hasQuestion: commentText.includes('?'),
        sentiment: 'neutral',
        isSpam: false,
        category: 'general',
        keywords: []
      }
    };
  }
};

export const generateTextEmbedding = async (text: string): Promise<any> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit text length
    });

    return {
      success: true,
      embedding: response.data[0].embedding,
      dimensions: response.data[0].embedding.length
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const summarizeTranscript = async (transcript: string, videoTitle: string): Promise<any> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Summarize this video transcript in 2-3 sentences, focusing on the main topics and key points.'
        },
        {
          role: 'user',
          content: `Video Title: ${videoTitle}\n\nTranscript: ${transcript.substring(0, 3000)}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim();

    return {
      success: true,
      summary: summary || 'Summary not available'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const extractKeyTopics = async (transcript: string, videoTitle: string): Promise<any> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract 5-10 key topics from this video transcript. Return as a simple array of topic strings.'
        },
        {
          role: 'user',
          content: `Video Title: ${videoTitle}\n\nTranscript: ${transcript.substring(0, 3000)}`
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const topicsText = response.choices[0]?.message?.content?.trim();
    const topics = topicsText ? topicsText.split('\n').map(t => t.replace(/^\d+\.\s*/, '').trim()).filter(t => t.length > 0) : [];

    return {
      success: true,
      topics: topics.slice(0, 10)
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      topics: []
    };
  }
};

export const getModelInfo = () => {
  return {
    availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    defaultModel: DEFAULT_MODEL,
    maxTokens: MAX_TOKENS,
    pricing: {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    }
  };
};

export default {
  generateReply,
  validateReply,
  countTokens,
  truncateText,
  getModelInfo,
  analyzeCommentIntent,
  generateTextEmbedding,
  summarizeTranscript,
  extractKeyTopics
};