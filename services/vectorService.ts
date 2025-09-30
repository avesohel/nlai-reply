import { Pinecone } from '@pinecone-database/pinecone';
import { generateTextEmbedding } from './openaiService';

interface TranscriptData {
  videoId: string;
  userId: string;
  transcript: string;
  summary: string;
  keyTopics: string[];
  videoTitle: string;
}

interface VectorMatch {
  videoId: string;
  videoTitle: string;
  summary: string;
  keyTopics: string[];
  similarity: number;
  createdAt: string;
}

interface VectorSearchResult {
  success: boolean;
  matches: VectorMatch[];
  totalFound?: number;
  error?: string;
}

interface VectorUpsertResult {
  success: boolean;
  vectorId?: string;
  dimensions?: number;
  processed?: number;
  error?: string;
}

interface ContextResult {
  success: boolean;
  context: string;
  matches: VectorMatch[];
  error?: string;
}

class VectorService {
  private pinecone: Pinecone | null = null;
  private index: any = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if Pinecone API key is available
      if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'your-pinecone-api-key') {
        console.warn('⚠️ Pinecone API key not configured, vector features disabled');
        return;
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT!,
      });

      const indexName = process.env.PINECONE_INDEX_NAME || 'youtube-transcripts';
      this.index = this.pinecone.index(indexName);
      this.initialized = true;

      console.log('✅ Pinecone vector database initialized');
    } catch (error: any) {
      console.warn('⚠️ Pinecone connection failed, vector features disabled:', error.message);
      // Don't throw error, just disable vector features
      this.initialized = false;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) {
      throw new Error('Vector service not available - Pinecone connection failed');
    }
  }

  async upsertTranscript(transcriptData: TranscriptData): Promise<VectorUpsertResult> {
    try {
      await this.ensureInitialized();

      const { videoId, userId, transcript, summary, keyTopics, videoTitle } = transcriptData;

      const textToEmbed = `${videoTitle || ''} ${summary || ''} ${transcript || ''}`.trim();

      if (!textToEmbed) {
        throw new Error('No content to embed');
      }

      const embeddingResult = await generateTextEmbedding(textToEmbed);

      if (!embeddingResult.success) {
        throw new Error(`Failed to generate embedding: ${embeddingResult.error}`);
      }

      const vector = {
        id: `${userId}_${videoId}`,
        values: embeddingResult.embedding,
        metadata: {
          userId,
          videoId,
          videoTitle: videoTitle || '',
          summary: summary || '',
          keyTopics: keyTopics || [],
          wordCount: transcript ? transcript.split(' ').length : 0,
          createdAt: new Date().toISOString()
        }
      };

      await this.index.upsert([vector]);

      console.log(`✅ Vector upserted for video: ${videoId}`);

      return {
        success: true,
        vectorId: vector.id,
        dimensions: embeddingResult.dimensions
      };
    } catch (error: any) {
      console.error('Vector upsert error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findSimilarContent(query: string, userId: string, options: any = {}): Promise<VectorSearchResult> {
    try {
      await this.ensureInitialized();

      const {
        topK = 5,
        threshold = parseFloat(process.env.AI_SIMILARITY_THRESHOLD!) || 0.8,
        includeMetadata = true
      } = options;

      const embeddingResult = await generateTextEmbedding(query);

      if (!embeddingResult.success) {
        throw new Error(`Failed to generate query embedding: ${embeddingResult.error}`);
      }

      const queryRequest = {
        vector: embeddingResult.embedding,
        topK,
        includeMetadata,
        filter: {
          userId: { '$eq': userId }
        }
      };

      const queryResponse = await this.index.query(queryRequest);

      const filteredMatches: VectorMatch[] = queryResponse.matches
        .filter((match: any) => match.score >= threshold)
        .map((match: any) => ({
          videoId: match.metadata.videoId,
          videoTitle: match.metadata.videoTitle,
          summary: match.metadata.summary,
          keyTopics: match.metadata.keyTopics,
          similarity: match.score,
          createdAt: match.metadata.createdAt
        }));

      return {
        success: true,
        matches: filteredMatches,
        totalFound: queryResponse.matches.length
      };
    } catch (error: any) {
      console.error('Vector search error:', error);
      return {
        success: false,
        error: error.message,
        matches: []
      };
    }
  }

  async getRelevantContext(commentText: string, userId: string, videoId: string | null = null): Promise<ContextResult> {
    try {
      await this.ensureInitialized();

      let searchQuery = commentText;

      if (videoId) {
        const currentVideoVector = await this.index.fetch([`${userId}_${videoId}`]);
        if (currentVideoVector.vectors[`${userId}_${videoId}`]) {
          const metadata = currentVideoVector.vectors[`${userId}_${videoId}`].metadata;
          searchQuery = `${commentText} ${metadata.summary || ''} ${metadata.keyTopics?.join(' ') || ''}`;
        }
      }

      const similarContent = await this.findSimilarContent(searchQuery, userId, {
        topK: 3,
        threshold: 0.75
      });

      if (!similarContent.success || similarContent.matches.length === 0) {
        return {
          success: true,
          context: '',
          matches: []
        };
      }

      const contextPieces = similarContent.matches.map(match =>
        `Video: "${match.videoTitle}" - ${match.summary}`
      );

      const context = contextPieces.join('\n\n').substring(0, 1000);

      return {
        success: true,
        context,
        matches: similarContent.matches
      };
    } catch (error: any) {
      console.error('Context retrieval error:', error);
      return {
        success: false,
        error: error.message,
        context: '',
        matches: []
      };
    }
  }

  async deleteVector(userId: string, videoId: string): Promise<VectorUpsertResult> {
    try {
      await this.ensureInitialized();

      const vectorId = `${userId}_${videoId}`;
      await this.index.deleteOne(vectorId);

      console.log(`✅ Vector deleted: ${vectorId}`);

      return {
        success: true,
        vectorId
      };
    } catch (error: any) {
      console.error('Vector deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteUserVectors(userId: string): Promise<VectorUpsertResult> {
    try {
      await this.ensureInitialized();

      await this.index.delete({
        filter: {
          userId: { '$eq': userId }
        }
      });

      console.log(`✅ All vectors deleted for user: ${userId}`);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('User vectors deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getIndexStats(): Promise<any> {
    try {
      // Check if vector service is available before trying to connect
      if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'your-pinecone-api-key') {
        return {
          success: false,
          error: 'Vector database not configured',
          stats: null
        };
      }

      await this.ensureInitialized();

      const stats = await this.index.describeIndexStats();

      return {
        success: true,
        stats: {
          totalVectors: stats.totalVectorCount,
          dimension: stats.dimension,
          indexFullness: stats.indexFullness
        }
      };
    } catch (error: any) {
      // Don't log connection errors as they're expected when Pinecone is not configured
      return {
        success: false,
        error: 'Vector database unavailable',
        stats: null
      };
    }
  }

  async searchByKeywords(keywords: string | string[], userId: string, options: any = {}): Promise<VectorSearchResult> {
    try {
      const keywordString = Array.isArray(keywords) ? keywords.join(' ') : keywords;
      return await this.findSimilarContent(keywordString, userId, options);
    } catch (error: any) {
      console.error('Keyword search error:', error);
      return {
        success: false,
        error: error.message,
        matches: []
      };
    }
  }

  async batchUpsert(transcriptDataArray: TranscriptData[]): Promise<VectorUpsertResult> {
    try {
      await this.ensureInitialized();

      const vectors = [];

      for (const transcriptData of transcriptDataArray) {
        const { videoId, userId, transcript, summary, keyTopics, videoTitle } = transcriptData;

        const textToEmbed = `${videoTitle || ''} ${summary || ''} ${transcript || ''}`.trim();

        if (textToEmbed) {
          const embeddingResult = await generateTextEmbedding(textToEmbed);

          if (embeddingResult.success) {
            vectors.push({
              id: `${userId}_${videoId}`,
              values: embeddingResult.embedding,
              metadata: {
                userId,
                videoId,
                videoTitle: videoTitle || '',
                summary: summary || '',
                keyTopics: keyTopics || [],
                wordCount: transcript ? transcript.split(' ').length : 0,
                createdAt: new Date().toISOString()
              }
            });
          }
        }
      }

      if (vectors.length === 0) {
        return {
          success: false,
          error: 'No vectors to upsert',
          processed: 0
        };
      }

      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert(batch);
        processed += batch.length;
      }

      console.log(`✅ Batch upserted ${processed} vectors`);

      return {
        success: true,
        processed
      };
    } catch (error: any) {
      console.error('Batch upsert error:', error);
      return {
        success: false,
        error: error.message,
        processed: 0
      };
    }
  }
}

const vectorService = new VectorService();

export default vectorService;