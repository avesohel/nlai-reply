const OpenAI = require('openai');
const { encoding_for_model } = require('tiktoken');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 150;

const countTokens = (text, model = DEFAULT_MODEL) => {
  try {
    const encoding = encoding_for_model(model);
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  } catch (error) {
    return Math.ceil(text.length / 4);
  }
};

const truncateText = (text, maxTokens, model = DEFAULT_MODEL) => {
  const tokens = countTokens(text, model);
  if (tokens <= maxTokens) return text;

  const ratio = maxTokens / tokens;
  return text.substring(0, Math.floor(text.length * ratio * 0.9));
};

const generateReply = async (commentData, videoContext, userSettings) => {
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

    const systemPrompt = buildSystemPrompt(tone, length, personality, instructions, channelSpecific);
    const userPrompt = buildUserPrompt(commentData, videoContext);

    const truncatedUserPrompt = truncateText(userPrompt, 3000, model);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: truncatedUserPrompt }
    ];

    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const responseTime = Date.now() - startTime;
    const reply = completion.choices[0].message.content.trim();

    return {
      success: true,
      reply,
      metadata: {
        model,
        tokensUsed: completion.usage.total_tokens,
        responseTime,
        finishReason: completion.choices[0].finish_reason
      }
    };
  } catch (error) {
    console.error('OpenAI reply generation error:', error);
    return {
      success: false,
      error: error.message,
      fallbackReply: generateFallbackReply(commentData, tone)
    };
  }
};

const buildSystemPrompt = (tone, length, personality, instructions, channelSpecific) => {
  let prompt = `You are an AI assistant helping a YouTube content creator respond to comments. Your responses should be:

TONE: ${tone}
LENGTH: ${length === 'short' ? '1-2 sentences' : length === 'medium' ? '2-3 sentences' : '3-4 sentences'}

PERSONALITY TRAITS:
- Enthusiasm Level: ${personality.enthusiasmLevel || 7}/10
- Formality Level: ${personality.formalityLevel || 5}/10
- Humor Level: ${personality.humorLevel || 3}/10
- Helpfulness Level: ${personality.helpfulnessLevel || 9}/10

INSTRUCTIONS: ${instructions}`;

  if (channelSpecific) {
    prompt += `\n\nCHANNEL-SPECIFIC TONE: ${channelSpecific.customTone || 'default'}`;
    prompt += `\nCHANNEL-SPECIFIC INSTRUCTIONS: ${channelSpecific.customInstructions || 'none'}`;
  }

  prompt += `\n\nIMPORTANT RULES:
- Be authentic and human-like
- Reference the video content when relevant
- Show appreciation for engagement
- Avoid generic responses
- Don't mention that you're an AI
- Keep responses conversational
- Use emojis sparingly and naturally`;

  return prompt;
};

const buildUserPrompt = (commentData, videoContext) => {
  let prompt = `VIDEO CONTEXT:
Title: ${videoContext.title || 'Unknown'}
Description: ${videoContext.description ? videoContext.description.substring(0, 200) + '...' : 'No description'}`;

  if (videoContext.transcript) {
    prompt += `\nKey Content: ${videoContext.transcript.substring(0, 500)}...`;
  }

  if (videoContext.summary) {
    prompt += `\nVideo Summary: ${videoContext.summary}`;
  }

  if (videoContext.keyTopics && videoContext.keyTopics.length > 0) {
    prompt += `\nMain Topics: ${videoContext.keyTopics.join(', ')}`;
  }

  prompt += `\n\nCOMMENT TO RESPOND TO:
Author: ${commentData.author}
Comment: "${commentData.text}"
Likes: ${commentData.likeCount || 0}
Sentiment: ${commentData.sentiment || 'neutral'}`;

  if (commentData.context) {
    prompt += `\nContext: ${commentData.context}`;
  }

  prompt += `\n\nGenerate a natural, engaging reply that acknowledges the comment and adds value to the conversation:`;

  return prompt;
};

const generateFallbackReply = (commentData, tone = 'friendly') => {
  const fallbacks = {
    friendly: [
      `Thanks for watching and taking the time to comment! 😊`,
      `I appreciate your engagement! Thanks for being part of the community! 🙏`,
      `Great point! Thanks for sharing your thoughts! 👍`
    ],
    professional: [
      `Thank you for your thoughtful comment.`,
      `I appreciate your feedback and engagement.`,
      `Thank you for watching and contributing to the discussion.`
    ],
    casual: [
      `Thanks for watching! 🎉`,
      `Appreciate you! 💪`,
      `Thanks for the comment! 🔥`
    ]
  };

  const options = fallbacks[tone] || fallbacks.friendly;
  return options[Math.floor(Math.random() * options.length)];
};

const generateTextEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
      encoding_format: 'float',
    });

    return {
      success: true,
      embedding: response.data[0].embedding,
      dimensions: response.data[0].embedding.length,
      tokensUsed: response.usage.total_tokens
    };
  } catch (error) {
    console.error('OpenAI embedding generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const summarizeTranscript = async (transcript, videoTitle = '') => {
  try {
    const truncatedTranscript = truncateText(transcript, 2500);

    const messages = [
      {
        role: 'system',
        content: 'You are an expert at summarizing video content. Create concise, informative summaries that capture the key points, main topics, and essential information.'
      },
      {
        role: 'user',
        content: `Summarize this video transcript in 2-3 sentences. Focus on the main topics and key takeaways.

Video Title: ${videoTitle}

Transcript:
${truncatedTranscript}

Summary:`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 200,
      temperature: 0.3,
    });

    return {
      success: true,
      summary: completion.choices[0].message.content.trim(),
      tokensUsed: completion.usage.total_tokens
    };
  } catch (error) {
    console.error('OpenAI summarization error:', error);
    return {
      success: false,
      error: error.message,
      summary: `This video covers various topics related to ${videoTitle || 'the subject matter'}.`
    };
  }
};

const extractKeyTopics = async (transcript, videoTitle = '') => {
  try {
    const truncatedTranscript = truncateText(transcript, 2000);

    const messages = [
      {
        role: 'system',
        content: 'Extract the main topics and keywords from video content. Return only the most important topics as a comma-separated list.'
      },
      {
        role: 'user',
        content: `Extract 5-10 key topics from this video transcript. Return only the topics as a comma-separated list.

Video Title: ${videoTitle}

Transcript:
${truncatedTranscript}

Key Topics:`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 100,
      temperature: 0.2,
    });

    const topicsString = completion.choices[0].message.content.trim();
    const topics = topicsString
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .slice(0, 10);

    return {
      success: true,
      topics,
      tokensUsed: completion.usage.total_tokens
    };
  } catch (error) {
    console.error('OpenAI topic extraction error:', error);
    return {
      success: false,
      error: error.message,
      topics: []
    };
  }
};

const analyzeCommentIntent = async (commentText) => {
  try {
    const messages = [
      {
        role: 'system',
        content: 'Analyze the intent and characteristics of YouTube comments. Be concise and accurate.'
      },
      {
        role: 'user',
        content: `Analyze this YouTube comment and return a JSON object with the following properties:
- hasQuestion: boolean (does it ask a question?)
- sentiment: string ("positive", "negative", or "neutral")
- isSpam: boolean (is it likely spam?)
- category: string (what type of comment: "question", "praise", "criticism", "general", "spam")
- keywords: array of important words/phrases

Comment: "${commentText}"

Analysis:`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 150,
      temperature: 0.1,
    });

    const analysisText = completion.choices[0].message.content.trim();

    try {
      const analysis = JSON.parse(analysisText);
      return {
        success: true,
        analysis,
        tokensUsed: completion.usage.total_tokens
      };
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse analysis JSON',
        analysis: {
          hasQuestion: commentText.includes('?'),
          sentiment: 'neutral',
          isSpam: false,
          category: 'general',
          keywords: []
        }
      };
    }
  } catch (error) {
    console.error('OpenAI comment analysis error:', error);
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

module.exports = {
  generateReply,
  generateTextEmbedding,
  summarizeTranscript,
  extractKeyTopics,
  analyzeCommentIntent,
  countTokens,
  truncateText
};