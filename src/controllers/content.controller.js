const sheetsService = require('../services/sheets.service');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');
const wordpressService = require('../services/wordpress');
const contentStorage = require('../utils/storage');

class ContentController {
  async createSeoPost(req, res) {
    try {
      console.log('[CONTENT] Starting complete SEO post creation process');

      // Check if WordPress service is initialized
      if (!wordpressService.isInitialized) {
        throw new Error('WordPress service is not initialized. Please try again later.');
      }

      // Step 1: Get next keyword from sheets
      console.log('[CONTENT] Fetching next unprocessed keyword');
      const keywordData = await sheetsService.getNextUnprocessedPost();
      
      if (!keywordData) {
        return res.json({
          success: true,
          message: 'No unprocessed keywords found',
          summary: { total: 0, processed: 0, failed: 0 }
        });
      }

      const keyword = keywordData.keyword;
      console.log('[CONTENT] Processing keyword:', keyword);

      try {
        // Store pre-creation state
        await contentStorage.storeContent(
          `seo/posts/${new Date().toISOString().split('T')[0]}/pre_creation.json`,
          { keyword, timestamp: new Date().toISOString() },
          { type: 'pre_creation', keyword }
        );

        // Step 2: Generate initial structure and content
        console.log('[CONTENT] Generating content structure');
        const initialStructure = await this.generateInitialStructure(keyword);
        await contentStorage.storeContent(
          `seo/keywords/${initialStructure.slug}/structure.json`,
          initialStructure,
          { type: 'structure', keyword }
        );

        // Step 3: Generate detailed content
        console.log('[CONTENT] Generating detailed content');
        const detailedContent = await this.generateDetailedContent(initialStructure);
        await contentStorage.storeContent(
          `seo/keywords/${initialStructure.slug}/content.json`,
          detailedContent,
          { type: 'content', keyword }
        );

        // Step 4: Compose final HTML with images
        console.log('[CONTENT] Composing final HTML with images');
        const composedContent = await composerService.composeHtml(detailedContent);
        await contentStorage.storeContent(
          `seo/keywords/${initialStructure.slug}/composed.json`,
          composedContent,
          { type: 'composed', keyword }
        );

        // Step 5: Create WordPress post
        console.log('[CONTENT] Creating WordPress post');
        const wordpressResult = await wordpressService.createPost(composedContent);

        // Step 6: Mark as processed in sheets
        await sheetsService.markPostAsProcessed(keywordData, 'success');

        // Return success response
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
        return res.json(response);

      } catch (error) {
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

        throw error;
      }
    } catch (error) {
      console.error('[CONTENT] Critical error in SEO post creation:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }

  async generateInitialStructure(keyword) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content planner. Create a content structure for the given keyword.

CRITICAL: Return ONLY a valid JSON object with EXACTLY these fields:
{
  "title": "SEO-optimized title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO meta title",
    "description": "Meta description with call-to-action",
    "focus_keyword": "primary keyword"
  },
  "outline": [
    {
      "type": "section",
      "title": "Section title",
      "key_points": ["point 1", "point 2"]
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create a content structure for the keyword: "${keyword}"

IMPORTANT:
- Return ONLY valid JSON
- Create compelling titles
- Include clear sections
- Focus on user intent
- Optimize for SEO`
      }
    ];

    const completion = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages
    });

    return JSON.parse(completion.data.choices[0].message.content);
  }

  async generateDetailedContent(structure) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create detailed content following the provided structure.

CRITICAL: Return ONLY a valid JSON object with EXACTLY these fields:
{
  "title": "Post title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO title",
    "description": "Meta description",
    "focus_keyword": "primary keyword"
  },
  "content": {
    "html": "Full HTML content"
  }
}`
      },
      {
        role: 'user',
        content: `Create detailed content following this structure:
${JSON.stringify(structure, null, 2)}

IMPORTANT:
- Return ONLY valid JSON
- Create engaging content
- Use semantic HTML
- Optimize for SEO
- Include schema.org markup`
      }
    ];

    const completion = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages
    });

    return JSON.parse(completion.data.choices[0].message.content);
  }

  async recoverPostCreation(req, res) {
    try {
      const { date, keyword } = req.params;
      console.log('[CONTENT] Starting recovery process for:', { date, keyword });

      // Check WordPress initialization
      if (!wordpressService.isInitialized) {
        throw new Error('WordPress service is not initialized. Please try again later.');
      }

      // Create slug from keyword
      const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Try to find the composed content
      console.log('[CONTENT] Attempting to retrieve composed content');
      const composedPath = `seo/keywords/${slug}/composed.json`;
      
      let composedContent;
      try {
        composedContent = await contentStorage.getContent(composedPath);
        console.log('[CONTENT] Found composed content');
      } catch (error) {
        console.error('[CONTENT] Could not find composed content:', error);
        throw new Error('Could not find composed content for recovery');
      }

      // Get the sheets row data for updating status
      console.log('[CONTENT] Finding keyword in sheets');
      const sheetsData = await sheetsService.findKeywordRow(keyword);
      
      if (!sheetsData) {
        console.warn('[CONTENT] Keyword not found in sheets, continuing without sheets update');
      }

      try {
        // Attempt WordPress post creation
        console.log('[CONTENT] Attempting WordPress post creation');
        const wordpressResult = await wordpressService.createPost(composedContent);

        // Update sheets if we found the row
        if (sheetsData) {
          await sheetsService.markPostAsProcessed(sheetsData, 'success');
        }

        // Return success response
        const response = {
          success: true,
          recovered: true,
          keyword,
          wordpress_id: wordpressResult.wordpress_id,
          wordpress_url: wordpressResult.wordpress_url,
          created_at: wordpressResult.created_at
        };

        console.log('[CONTENT] Successfully recovered and created WordPress post:', response);
        return res.json(response);

      } catch (error) {
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

        throw error;
      }
    } catch (error) {
      console.error('[CONTENT] Critical error in post recovery:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
}

module.exports = new ContentController();