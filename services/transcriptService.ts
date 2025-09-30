import { YoutubeTranscript } from 'youtube-transcript';
import { parse } from 'node-html-parser';
import sentiment from 'sentiment';
import natural from 'natural';

import VideoTranscript from '../models/VideoTranscript';
import { generateTextEmbedding, summarizeTranscript, extractKeyTopics } from './openaiService';

const sentimentAnalyzer = new sentiment();
const tokenizer = new natural.WordTokenizer();

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface VideoInfo {
  title: string;
  description: string;
  duration: number;
}

interface TranscriptResult {
  success: boolean;
  transcript?: any;
  cached?: boolean;
  error?: string;
}

interface TranscriptStats {
  total: number;
  processed: number;
  failed: number;
  totalWordCount: number;
  avgProcessingTime: number;
}

const extractTranscript = async (videoId: string, userId: string, channelId: string): Promise<TranscriptResult> => {
  try {
    console.log(`Extracting transcript for video: ${videoId}`);

    const existingTranscript = await VideoTranscript.findOne({ videoId });
    if (existingTranscript && (existingTranscript as any).isProcessed) {
      return {
        success: true,
        transcript: existingTranscript,
        cached: true
      };
    }

    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    } as any);

    if (!transcriptData || transcriptData.length === 0) {
      throw new Error('No transcript available for this video');
    }

    const processedSegments: TranscriptSegment[] = transcriptData.map((segment: any) => ({
      text: cleanTranscriptText(segment.text),
      start: segment.offset / 1000, // Convert to seconds
      duration: segment.duration / 1000
    }));

    const fullText = processedSegments
      .map(segment => segment.text)
      .join(' ')
      .trim();

    const videoInfo = await getVideoInfo(videoId);

    const transcript = existingTranscript || new VideoTranscript({
      user: userId,
      channelId,
      videoId,
      videoTitle: videoInfo.title,
      videoDescription: videoInfo.description,
      videoDuration: videoInfo.duration
    });

    transcript.transcript = {
      text: fullText,
      segments: processedSegments
    };

    transcript.metadata = {
      language: 'en',
      confidence: 0.8,
      wordCount: tokenizer.tokenize(fullText).length,
      extractedAt: new Date(),
      processingTime: 0
    };

    (transcript as any).processingStatus = 'processing';
    await transcript.save();

    await processTranscriptWithAI(transcript);

    return {
      success: true,
      transcript,
      cached: false
    };

  } catch (error: any) {
    console.error(`Transcript extraction error for ${videoId}:`, error);

    if (error.message.includes('No transcript')) {
      await VideoTranscript.findOneAndUpdate(
        { videoId },
        {
          processingStatus: 'failed',
          error: 'No transcript available',
          user: userId,
          channelId,
          videoId
        },
        { upsert: true }
      );
    }

    return {
      success: false,
      error: error.message,
      transcript: null
    };
  }
};

const processTranscriptWithAI = async (transcript: any): Promise<void> => {
  try {
    const startTime = Date.now();

    const [summaryResult, topicsResult, embeddingResult] = await Promise.allSettled([
      summarizeTranscript(transcript.transcript.text, transcript.videoTitle),
      extractKeyTopics(transcript.transcript.text, transcript.videoTitle),
      generateTextEmbedding(transcript.transcript.text)
    ]);

    if (summaryResult.status === 'fulfilled' && summaryResult.value.success) {
      transcript.summary = summaryResult.value.summary;
    }

    if (topicsResult.status === 'fulfilled' && topicsResult.value.success) {
      transcript.keyTopics = topicsResult.value.topics;
    }

    if (embeddingResult.status === 'fulfilled' && embeddingResult.value.success) {
      transcript.embedding = {
        vector: embeddingResult.value.embedding,
        model: 'text-embedding-ada-002',
        dimensions: embeddingResult.value.dimensions
      };
    }

    const sentimentResult = sentimentAnalyzer.analyze(transcript.transcript.text);
    transcript.aiAnalysis = {
      sentiment: {
        score: sentimentResult.score,
        label: sentimentResult.score > 0 ? 'positive' : sentimentResult.score < 0 ? 'negative' : 'neutral',
        confidence: Math.min(Math.abs(sentimentResult.score) / 10, 1)
      },
      categories: [],
      keywords: extractKeywords(transcript.transcript.text),
      entities: []
    };

    transcript.metadata.processingTime = Date.now() - startTime;
    transcript.processingStatus = 'completed';
    transcript.isProcessed = true;

    await transcript.save();

    console.log(`Successfully processed transcript for video: ${transcript.videoId}`);

  } catch (error: any) {
    console.error('AI processing error:', error);
    transcript.processingStatus = 'failed';
    transcript.error = error.message;
    await transcript.save();
  }
};

const getVideoInfo = async (videoId: string): Promise<VideoInfo> => {
  try {
    const { getVideoDetails } = require('./youtubeService');

    const videoDetails = await getVideoDetails(videoId, process.env.YOUTUBE_API_KEY!);

    return {
      title: videoDetails.snippet.title,
      description: videoDetails.snippet.description,
      duration: parseDuration(videoDetails.contentDetails.duration)
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      title: 'Unknown Video',
      description: '',
      duration: 0
    };
  }
};

const parseDuration = (duration: string): number => {
  try {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (match[1] || '0H').slice(0, -1);
    const minutes = (match[2] || '0M').slice(0, -1);
    const seconds = (match[3] || '0S').slice(0, -1);

    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  } catch (error) {
    return 0;
  }
};

const cleanTranscriptText = (text: string): string => {
  return text
    .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
};

const extractKeywords = (text: string, limit: number = 20): string[] => {
  const words = tokenizer.tokenize(text.toLowerCase()) || [];
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
    'its', 'our', 'their', 'so', 'very', 'really', 'just', 'like', 'now',
    'well', 'know', 'think', 'see', 'get', 'go', 'come', 'want', 'say'
  ]);

  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word) && /^[a-zA-Z]+$/.test(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word);
};

const getTranscriptByVideoId = async (videoId: string): Promise<any> => {
  try {
    const transcript = await VideoTranscript.findOne({ videoId, isProcessed: true });
    return transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
};

const getTranscriptsByUser = async (userId: string, options: any = {}): Promise<any[]> => {
  try {
    const {
      channelId,
      limit = 10,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = -1
    } = options;

    const query: any = { user: userId, isProcessed: true };
    if (channelId) query.channelId = channelId;

    const transcripts = await VideoTranscript.find(query)
      .select('videoId videoTitle summary keyTopics createdAt metadata.wordCount')
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip);

    return transcripts;
  } catch (error) {
    console.error('Error fetching user transcripts:', error);
    return [];
  }
};

const searchTranscripts = async (userId: string, query: string, options: any = {}): Promise<any[]> => {
  try {
    const { limit = 5, channelId } = options;

    const searchQuery: any = {
      user: userId,
      isProcessed: true,
      $or: [
        { videoTitle: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { keyTopics: { $in: [new RegExp(query, 'i')] } },
        { 'transcript.text': { $regex: query, $options: 'i' } }
      ]
    };

    if (channelId) searchQuery.channelId = channelId;

    const transcripts = await VideoTranscript.find(searchQuery)
      .select('videoId videoTitle summary keyTopics')
      .limit(limit)
      .sort({ createdAt: -1 });

    return transcripts;
  } catch (error) {
    console.error('Error searching transcripts:', error);
    return [];
  }
};

const deleteTranscript = async (videoId: string, userId: string): Promise<boolean> => {
  try {
    const result = await VideoTranscript.deleteOne({ videoId, user: userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting transcript:', error);
    return false;
  }
};

const getTranscriptStats = async (userId: string): Promise<TranscriptStats> => {
  try {
    const stats = await VideoTranscript.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          processed: { $sum: { $cond: ['$isProcessed', 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] } },
          totalWordCount: { $sum: '$metadata.wordCount' },
          avgProcessingTime: { $avg: '$metadata.processingTime' }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      processed: 0,
      failed: 0,
      totalWordCount: 0,
      avgProcessingTime: 0
    };
  } catch (error) {
    console.error('Error getting transcript stats:', error);
    return {
      total: 0,
      processed: 0,
      failed: 0,
      totalWordCount: 0,
      avgProcessingTime: 0
    };
  }
};

export {
  extractTranscript,
  processTranscriptWithAI,
  getTranscriptByVideoId,
  getTranscriptsByUser,
  searchTranscripts,
  deleteTranscript,
  getTranscriptStats,
  cleanTranscriptText,
  extractKeywords
};