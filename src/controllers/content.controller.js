const sheetsService = require('../services/sheets.service');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');
const contentStorage = require('../utils/storage');

class ContentController {
  async processContent(req, res) {
    console.log('[CONTENT] Starting content processing request');
    console.log('[CONTENT] Services status:', {
      sheets: sheetsService.isConnected ? 'connected' : 'disconnected',
      openai: openaiService.isInitialized ? 'connected' : 'disconnected'
    });

    try {
      console.log('[CONTENT] Fetching next unprocessed keyword from sheets');
      const data = await sheetsService.getNextUnprocessedPost();
      
      if (!data) {
        console.log('[CONTENT] No unprocessed keywords found');
        return res.json({
          success: true,
          message: 'No unprocessed keywords found',
          summary: { total: 0, processed: 0, failed: 0 }
        });
      }

      // Create keyword-specific folder path
      const keywordSlug = data.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const basePath = `seo/keywords/${keywordSlug}`;
      
      console.log('[CONTENT] Processing keyword:', data.keyword);
      console.log('[CONTENT] Storage path:', basePath);

      try {
        // Phase 1: Get JSON schema based on keyword intent
        console.log('[CONTENT] Phase 1: Determining content structure based on keyword intent');
        const schemaMessages = [
          {
            role: "assistant",
            content: "You are an expert at analyzing search intent and creating optimal content structures. Your task is to create a schema template with clear instructions for each section based on the keyword's intent."
          },
          {
            role: "user",
            content: `Analyze this keyword: "${data.keyword}"

For this KW we need a JSON structure of the best posible SEO article to rank exceptional on Google. You have to create the structure of the JSON with what you think it will be the best structure for the given KW. You can change the JSON structure, in fact, it is encouraged. The idea is you have total flexibility to change this, but keeping it in a JSON format that matches what you would expect for a wordpress post.

IMPORTANT:
- Return ONLY valid JSON
- Include clear instructions for each section
- Focus on STRUCTURE and REQUIREMENTS, not content
- Provide guidelines for content creation
- NO placeholder content
- NO markdown
- NO code blocks
- NO additional text`
          }
        ];

        console.log('[CONTENT] Requesting schema from o1-mini');
        const schemaCompletion = await openaiService.openai.createChatCompletion({
          model: 'o1-mini',
          messages: schemaMessages
        });

        const schemaContent = schemaCompletion.data.choices[0].message.content;
        console.log('[CONTENT] Schema generation complete, length:', schemaContent.length);

        // Store schema
        await contentStorage.storeContent(
          `${basePath}/schema.json`,
          JSON.parse(schemaContent),
          {
            type: 'schema',
            keyword: data.keyword,
            timestamp: new Date().toISOString()
          }
        );

        // Mark as processed in sheets
        await sheetsService.markPostAsProcessed(data, 'success');

        // Send successful response
        const response = {
          success: true,
          summary: {
            total: 1,
            processed: 1,
            failed: 0
          },
          processed: [{
            keyword: data.keyword,
            status: 'schema_generated',
            storagePath: `${basePath}/schema.json`
          }]
        };

        console.log('[CONTENT] Schema generation complete, stored at:', `${basePath}/schema.json`);
        return res.json(response);

      } catch (error) {
        console.error('[CONTENT] Error generating schema:', error);
        
        // Store error log
        const errorResponse = { 
          success: false, 
          error: error.message,
          keyword: data.keyword,
          timestamp: new Date().toISOString()
        };

        await contentStorage.storeContent(
          `seo/logs/${new Date().toISOString().split('T')[0]}/errors.json`,
          errorResponse,
          {
            type: 'error_log',
            keyword: data.keyword
          }
        );

        // Mark as failed in sheets
        await sheetsService.markPostAsProcessed(data, 'error', error.message);

        return res.status(500).json(errorResponse);
      }
    } catch (error) {
      console.error('[CONTENT] Error in process controller:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async generateContent(req, res) {
    try {
      const { keyword } = req.body;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: 'Keyword is required'
        });
      }

      const keywordSlug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const basePath = `seo/keywords/${keywordSlug}`;

      // Get the schema
      const schema = await contentStorage.getContent(`${basePath}/schema.json`);
      
      // Generate content based on schema
      const contentMessages = [
        {
          role: "assistant",
          content: "You are an expert content creator specializing in SEO-optimized articles. Your task is to generate content following the provided schema structure."
        },
        {
          role: "user",
          content: `Generate content for keyword "${keyword}" following this schema:
${JSON.stringify(schema, null, 2)}

IMPORTANT:
- Follow the schema structure exactly
- Create engaging, informative content
- Optimize for SEO
- Return valid JSON only
- NO markdown
- NO code blocks
- NO additional text`
        }
      ];

      const contentCompletion = await openaiService.openai.createChatCompletion({
        model: 'o1-mini',
        messages: contentMessages
      });

      const generatedContent = contentCompletion.data.choices[0].message.content;

      // Store generated content
      await contentStorage.storeContent(
        `${basePath}/content.json`,
        JSON.parse(generatedContent),
        {
          type: 'content',
          keyword,
          timestamp: new Date().toISOString()
        }
      );

      return res.json({
        success: true,
        keyword,
        storagePath: `${basePath}/content.json`
      });

    } catch (error) {
      console.error('[CONTENT] Error generating content:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async composeHtml(req, res) {
    try {
      const { keyword } = req.body;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: 'Keyword is required'
        });
      }

      const keywordSlug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const basePath = `seo/keywords/${keywordSlug}`;

      // Get the content
      const content = await contentStorage.getContent(`${basePath}/content.json`);
      
      // Generate HTML using composer service
      const composedHtml = await composerService.composeHtml(content);

      // Store HTML result
      await contentStorage.storeContent(
        `${basePath}/html.json`,
        composedHtml,
        {
          type: 'html',
          keyword,
          timestamp: new Date().toISOString()
        }
      );

      return res.json({
        success: true,
        keyword,
        storagePath: `${basePath}/html.json`
      });

    } catch (error) {
      console.error('[CONTENT] Error composing HTML:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ContentController();