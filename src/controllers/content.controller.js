const sheetsService = require('../services/sheets.service');
const wordpressService = require('../services/wordpress.service');
const contentService = require('../services/content.service');

class ContentController {
  async processContent(req, res) {
    try {
      // Get next unprocessed post
      const post = await sheetsService.getNextUnprocessedPost();
      
      if (!post) {
        return res.json({
          success: true,
          message: 'No unprocessed posts found',
          summary: {
            total: 0,
            processed: 0,
            failed: 0
          }
        });
      }

      console.log(`[CONTENT] Processing post ${post.postId} with keyword "${post.keyword}"`);
      
      try {
        // 1. Get WordPress content
        const wpContent = await wordpressService.getPost(post.postId);
        if (!wpContent) {
          await sheetsService.markPostAsProcessed(post, 'error', 'Failed to fetch WordPress content');
          throw new Error('Failed to fetch WordPress content');
        }

        // 2. Enhance content through v1, v2, and v3
        const enhancedPost = await contentService.enhanceContent(wpContent, post.keyword);
        
        // 3. Update WordPress post with enhanced content and meta
        const updateData = {
          content: enhancedPost.content,
          meta_title: enhancedPost.meta_title,
          meta_description: enhancedPost.meta_description
        };

        await wordpressService.updatePost(post.postId, updateData);
        
        // Mark as successfully processed
        await sheetsService.markPostAsProcessed(post, 'success');
        
        return res.json({
          success: true,
          summary: {
            total: 1,
            processed: 1,
            failed: 0
          },
          processed: [{
            postId: post.postId,
            status: 'success',
            enhancedAt: enhancedPost.enhanced_at
          }]
        });

      } catch (error) {
        console.error(`[CONTENT] Error processing post ${post.postId}:`, error);
        
        // Mark as processed with error
        await sheetsService.markPostAsProcessed(post, 'error', error.message);
        
        return res.json({
          success: false,
          summary: {
            total: 1,
            processed: 0,
            failed: 1
          },
          failed: [{
            postId: post.postId,
            error: error.message
          }]
        });
      }
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