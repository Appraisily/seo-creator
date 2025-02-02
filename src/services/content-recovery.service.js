const sheetsService = require('./sheets.service');
const wordpressService = require('./wordpress');
const structureService = require('./content/structure.service');
const imageService = require('./content/image.service');
const generatorService = require('./content/generator.service');
const contentStorage = require('../utils/storage');

class ContentRecoveryService {
  async recoverPost(date, keyword) {
    console.log('[CONTENT] Starting recovery process for:', { date, keyword });

    // Check WordPress initialization
    if (!wordpressService.isInitialized) {
      throw new Error('WordPress service is not initialized. Please try again later.');
    }

    // Get sheets data
    const sheetsData = await this.getSheetsData(keyword);

    try {
      // Step 1: Generate initial structure with image requirements
      console.log('[CONTENT] Regenerating content structure');
      const structure = await structureService.generateStructure(keyword);

      // Step 2: Generate and upload images
      console.log('[CONTENT] Regenerating and uploading images');
      const images = await imageService.generateAndUploadImages(structure);

      // Step 3: Generate detailed content with image URLs
      console.log('[CONTENT] Regenerating content with images');
      const content = await generatorService.generateContent(structure, images);

      // Step 4: Create WordPress post
      console.log('[CONTENT] Creating WordPress post');
      const wordpressResult = await wordpressService.createPost(content);

      // Update sheets if we found the row
      if (sheetsData) {
        await sheetsService.markPostAsProcessed(sheetsData, 'success');
      }

      // Store recovery result for logging
      await this.storeRecoveryResult(date, keyword, {
        structure,
        content,
        wordpress: wordpressResult
      });

      return this.createSuccessResponse(keyword, wordpressResult);

    } catch (error) {
      await this.handleError(error, sheetsData, date, keyword);
      throw error;
    }
  }

  async getSheetsData(keyword) {
    console.log('[CONTENT] Finding keyword in sheets');
    const sheetsData = await sheetsService.findKeywordRow(keyword);
    
    if (!sheetsData) {
      console.warn('[CONTENT] Keyword not found in sheets, continuing without sheets update');
    }

    return sheetsData;
  }

  async storeRecoveryResult(date, keyword, data) {
    const recoveryLog = {
      timestamp: new Date().toISOString(),
      keyword,
      date,
      recovery_type: 'regenerate',
      structure: data.structure,
      wordpress_result: {
        id: data.wordpress.wordpress_id,
        url: data.wordpress.wordpress_url,
        created_at: data.wordpress.created_at
      }
    };

    await contentStorage.storeContent(
      `seo/logs/recovery/${date}/success.json`,
      recoveryLog,
      { type: 'recovery_success', keyword }
    );
  }

  createSuccessResponse(keyword, wordpressResult) {
    const response = {
      success: true,
      recovered: true,
      recovery_type: 'regenerate',
      keyword,
      wordpress_id: wordpressResult.wordpress_id,
      wordpress_url: wordpressResult.wordpress_url,
      created_at: wordpressResult.created_at
    };

    console.log('[CONTENT] Successfully recovered and created WordPress post:', response);
    return response;
  }

  async handleError(error, sheetsData, date, keyword) {
    console.error('[CONTENT] Recovery failed:', error);
    
    // Update sheets if we found the row
    if (sheetsData) {
      await sheetsService.markPostAsProcessed(sheetsData, 'error', error.message);
    }

    // Store error details
    const errorLog = {
      timestamp: new Date().toISOString(),
      keyword,
      recovery_type: 'regenerate',
      error: {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      }
    };

    await contentStorage.storeContent(
      `seo/logs/recovery/${date}/errors.json`,
      errorLog,
      { type: 'recovery_error', keyword }
    );
  }
}

module.exports = ContentRecoveryService;