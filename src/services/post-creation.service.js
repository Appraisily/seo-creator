const sheetsService = require('./sheets.service');
const wordpressService = require('./wordpress');
const contentStorage = require('../utils/storage');
const structureService = require('./content/structure.service');
const imageService = require('./content/image.service');
const generatorService = require('./content/generator.service');

class PostCreationService {
  async createPost() {
    console.log('[CONTENT] Starting complete SEO post creation process');

    if (!wordpressService.isInitialized) {
      throw new Error('WordPress service is not initialized. Please try again later.');
    }

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

    let structure, content, composedContent, wordpressResult;

    try {
      // Store pre-creation state
      await this.storePreCreationState(keyword);

      // Step 1: Generate initial structure with image requirements
      structure = await structureService.generateStructure(keyword);
      await this.storeStructure(structure, keyword);

      // Step 2: Generate and upload images
      const images = await imageService.generateAndUploadImages(structure);

      // Step 3: Generate detailed content with image URLs
      content = await generatorService.generateContent(structure, images);
      await this.storeContent(structure.slug, content, keyword);

      // Step 4: Create WordPress post
      console.log('[CONTENT] Creating WordPress post');
      wordpressResult = await wordpressService.createPost(content);

      // Step 5: Mark as processed in sheets
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