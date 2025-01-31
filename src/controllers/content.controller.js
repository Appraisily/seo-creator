const sheetsService = require('../services/sheets.service');

class ContentController {
  async processContent(req, res) {
    try {
      // Get next unprocessed keyword
      const data = await sheetsService.getNextUnprocessedPost();
      
      if (!data) {
        return res.json({
          success: true,
          message: 'No unprocessed keywords found',
          summary: {
            total: 0,
            processed: 0,
            failed: 0
          }
        });
      }

      console.log('[CONTENT] Processing keyword:', data.keyword);
      
      // For now, just mark it as processed
      await sheetsService.markPostAsProcessed(data, 'success');
      
      return res.json({
        success: true,
        summary: {
          total: 1,
          processed: 1,
          failed: 0
        },
        processed: [{
          keyword: data.keyword,
          status: 'success'
        }]
      });

    } catch (error) {
      console.error('[CONTENT] Error in process controller:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

module.exports = new ContentController();