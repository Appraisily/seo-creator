const sheetsService = require('./sheets.service');
const wordpressService = require('./wordpress');
const contentStorage = require('../utils/storage');
const ContentGenerationService = require('./content-generation.service');

class PostCreationService {
  constructor() {
    this.generationService = new ContentGenerationService();
  }

  async createPost() {
    console.log('[CONTENT] Starting complete SEO post creation process');

    // Check if WordPress service is initialized
    if (!wordpressService.isInitialized) {
      throw new Error('WordPress service is not initialized. Please try again later.');
    }

    // Step 1: Get next keyword from sheets
    console.log('[CONTENT] Fetching next unprocessed keyword');
    const keywordData = await sheetsService.getNextUnprocessedPost();
    
    if (!keywordData) {
      return {
        success: true,
        message: 'No unprocessed keywords found',
        summary: { total: 0, processed: 0, failed: 0 }
      };
    }

    const keyword = keywordData.keyword;
    console.log('[CONTENT] Processing keyword:', keyword);

    try {
      // Store pre-creation state
      await this.storePreCreationState(keyword);

      // Step 2: Generate initial structure and content
      const initialStructure = await this.generationService.generateInitialStructure(keyword);
      await this.storeStructure(initialStructure, keyword);

      // Step 3: Generate detailed content
      const detailedContent = await this.generationService.generateDetailedContent(initialStructure);
      await this.storeContent(initialStructure.slug, detailedContent, keyword);

      // Step 4: Compose final HTML with images
      const composedContent = await this.generationService.composeHtml(keyword);
      await this.storeComposedContent(initialStructure.slug, composedContent, keyword);

      // Step 5: Create WordPress post
      console.log('[CONTENT] Creating WordPress post');
      const wordpressResult = await wordpressService.createPost(composedContent);

      // Step 6: Mark as processed in sheets
      await sheetsService.markPostAsProcessed(keywordData, 'success');

      return this.createSuccessResponse(keyword, wordpressResult);

    } catch (error) {
      await this.handleError(error, keywordData, keyword);
      throw error;
    }
  }

  async storePreCreationState(keyword) {
    await contentStorage.storeContent(
      `seo/posts/${new Date().toISOString().split('T')[0]}/pre_creation.json`,
      { keyword, timestamp: new Date().toISOString() },
      { type: 'pre_creation', keyword }
    );
  }

  async storeStructure(structure, keyword) {
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/structure.json`,
      structure,
      { type: 'structure', keyword }
    );
  }

  async storeContent(slug, content, keyword) {
    await contentStorage.storeContent(
      `seo/keywords/${slug}/content.json`,
      content,
      { type: 'content', keyword }
    );
  }

  async storeComposedContent(slug, content, keyword) {
    await contentStorage.storeContent(
      `seo/keywords/${slug}/composed.json`,
      content,
      { type: 'composed', keyword }
    );
  }

  createSuccessResponse(keyword, wordpressResult) {
    const response = {
      success: true,
      keyword,
      wordpress_id: wordpressResult.wordpress_id,
      wordpress_url: wordpressResult.wordpress_url,
      created_at: wordpressResult.created_at,
      summary: {
        total: 1,
        processed: 1,
        failed: 0
      }
    };

    console.log('[CONTENT] Successfully created SEO post:', response);
    return response;
  }

  async handleError(error, keywordData, keyword) {
    console.error('[CONTENT] Error in SEO post creation:', error);
    
    // Log error and mark as failed in sheets
    await sheetsService.markPostAsProcessed(keywordData, 'error', error.message);
    
    // Store error details
    const errorLog = {
      timestamp: new Date().toISOString(),
      keyword,
      error: {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      }
    };

    await contentStorage.storeContent(
      `seo/logs/${new Date().toISOString().split('T')[0]}/errors.json`,
      errorLog,
      { type: 'error_log', keyword }
    );
  }
}

module.exports = PostCreationService;