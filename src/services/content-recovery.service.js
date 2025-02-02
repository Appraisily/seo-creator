const sheetsService = require('./sheets.service');
const wordpressService = require('./wordpress');
const contentStorage = require('../utils/storage');

class ContentRecoveryService {
  async recoverPost(date, keyword) {
    console.log('[CONTENT] Starting recovery process for:', { date, keyword });

    // Check WordPress initialization
    if (!wordpressService.isInitialized) {
      throw new Error('WordPress service is not initialized. Please try again later.');
    }

    // Get composed content
    const composedContent = await this.getComposedContent(keyword);

    // Get sheets data
    const sheetsData = await this.getSheetsData(keyword);

    try {
      // Attempt WordPress post creation
      console.log('[CONTENT] Attempting WordPress post creation');
      const wordpressResult = await wordpressService.createPost(composedContent);

      // Update sheets if we found the row
      if (sheetsData) {
        await sheetsService.markPostAsProcessed(sheetsData, 'success');
      }

      return this.createSuccessResponse(keyword, wordpressResult);

    } catch (error) {
      await this.handleError(error, sheetsData, date, keyword);
      throw error;
    }
  }

  async getComposedContent(keyword) {
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Try multiple possible paths
    const paths = [
      `seo/keywords/${slug}/composed.json`,
      `seo/posts/${slug}/composed.json`,
      `seo/content/${slug}/composed.json`
    ];
    
    try {
      let content = null;
      let foundPath = null;

      // Try each path until we find the content
      for (const path of paths) {
        try {
          console.log('[CONTENT] Trying path:', path);
          content = await contentStorage.getContent(path);
          foundPath = path;
          break;
        } catch (error) {
          console.log('[CONTENT] Content not found at:', path);
          continue;
        }
      }

      if (!content) {
        throw new Error(`Content not found in any expected location for keyword: ${keyword}`);
      }

      console.log('[CONTENT] Found composed content at:', foundPath);
      return content;
    } catch (error) {
      console.error('[CONTENT] Error retrieving composed content:', error);
      throw new Error(`Could not find composed content for recovery: ${error.message}`);
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

  createSuccessResponse(keyword, wordpressResult) {
    const response = {
      success: true,
      recovered: true,
      keyword,
      wordpress_id: wordpressResult.wordpress_id,
      wordpress_url: wordpressResult.wordpress_url,
      created_at: wordpressResult.created_at
    };

    console.log('[CONTENT] Successfully recovered and created WordPress post:', response);
    return response;
  }

  async handleError(error, sheetsData, date, keyword) {
    console.error('[CONTENT] Recovery failed at WordPress creation:', error);
    
    // Update sheets if we found the row
    if (sheetsData) {
      await sheetsService.markPostAsProcessed(sheetsData, 'error', error.message);
    }

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
      `seo/logs/recovery/${date}/errors.json`,
      errorLog,
      { type: 'recovery_error', keyword }
    );
  }
}

module.exports = ContentRecoveryService;