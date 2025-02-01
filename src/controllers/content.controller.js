const sheetsService = require('../services/sheets.service');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');
const wordpressService = require('../services/wordpress');
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

  async createSeoPost(req, res) {
    try {
      console.log('[CONTENT] Starting complete SEO post creation process');

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
}

module.exports = new ContentController();