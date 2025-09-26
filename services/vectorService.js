const { Pinecone } = require('@pinecone-database/pinecone');
const { generateTextEmbedding } = require('./openaiService');

class VectorService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      const indexName = process.env.PINECONE_INDEX_NAME || 'youtube-transcripts';
      this.index = this.pinecone.index(indexName);
      this.initialized = true;

      console.log('✅ Pinecone vector database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async upsertTranscript(transcriptData) {
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
    } catch (error) {
      console.error('Vector upsert error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findSimilarContent(query, userId, options = {}) {
    try {
      await this.ensureInitialized();

      const {
        topK = 5,
        threshold = parseFloat(process.env.AI_SIMILARITY_THRESHOLD) || 0.8,
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

      const filteredMatches = queryResponse.matches
        .filter(match => match.score >= threshold)
        .map(match => ({
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
    } catch (error) {
      console.error('Vector search error:', error);
      return {
        success: false,
        error: error.message,
        matches: []
      };
    }
  }

  async getRelevantContext(commentText, userId, videoId = null) {
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
    } catch (error) {
      console.error('Context retrieval error:', error);
      return {
        success: false,
        error: error.message,
        context: '',
        matches: []
      };
    }
  }

  async deleteVector(userId, videoId) {
    try {
      await this.ensureInitialized();

      const vectorId = `${userId}_${videoId}`;
      await this.index.deleteOne(vectorId);

      console.log(`✅ Vector deleted: ${vectorId}`);

      return {
        success: true,
        vectorId
      };
    } catch (error) {
      console.error('Vector deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteUserVectors(userId) {
    try {
      await this.ensureInitialized();

      await this.index.delete({
        filter: {
          userId: { '$eq': userId }
        }
      });

      console.log(`✅ All vectors deleted for user: ${userId}`);

      return {
        success: true,
        userId
      };
    } catch (error) {
      console.error('User vectors deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getIndexStats() {
    try {
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
    } catch (error) {
      console.error('Index stats error:', error);
      return {
        success: false,
        error: error.message,
        stats: null
      };
    }
  }

  async searchByKeywords(keywords, userId, options = {}) {
    try {
      const keywordString = Array.isArray(keywords) ? keywords.join(' ') : keywords;
      return await this.findSimilarContent(keywordString, userId, options);
    } catch (error) {
      console.error('Keyword search error:', error);
      return {
        success: false,
        error: error.message,
        matches: []
      };
    }
  }

  async batchUpsert(transcriptDataArray) {
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
    } catch (error) {
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

module.exports = vectorService;