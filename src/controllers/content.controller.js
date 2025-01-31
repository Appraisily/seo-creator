const sheetsService = require('../services/sheets.service');
const openaiService = require('../services/openai.service');

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

      console.log('[CONTENT] Processing keyword:', data.keyword);
      console.log('[CONTENT] Row data:', {
        rowNumber: data.rowNumber,
        keyword: data.keyword
      });

      try {
        // Phase 1: Get JSON schema based on keyword intent
        console.log('[CONTENT] Phase 1: Determining content structure based on keyword intent');
        const schemaMessages = [
          {
            role: "assistant",
            content: "You are an expert at analyzing search intent and creating optimal content structures. Your task is to determine the best JSON schema for content based on the keyword's intent."
          },
          {
            role: "user",
            content: `Analyze this keyword: "${data.keyword}"

Based on the search intent, create a JSON schema that best serves the user's needs. The schema structure should be specifically designed for the type of content required.

Here's an example schema for reference, but DO NOT copy it exactly - adapt the structure based on the keyword's intent:

{
  "post": {
    "keyword": "YOUR_KEYWORD_HERE",
    "slug": "your-keyword-here",
    "title": "SEO-Optimized Title Including Your Keyword",
    "meta_description": "SEO-friendly meta description of 140–160 characters including your primary keyword.",
    
    "images": [
      {
        "label": "featured_image",
        "image_prompt": "Describe the exact image you'd like to generate using AI (e.g., style, color, background, subject).",
        "suggested_alt_text": "Short, descriptive alt text including your keyword if appropriate.",
        "suggested_title": "Optional image title attribute."
      }
    ],

    "introduction": "Introductory paragraph(s) that includes the keyword in the first 100 words.",
    
    "body": [
      {
        "heading": "H2 or H3 Subheading – Variation or Related Keyword",
        "content": "Discuss your sub-topic or supporting details here."
      }
    ],
    
    "faq_section": [
      {
        "question": "Related FAQ #1",
        "answer": "Short, concise answer referencing your keyword naturally."
      }
    ],

    "additional_info": {
      "tips": [
        "Bullet point tip 1",
        "Bullet point tip 2"
      ],
      "external_links": [
        {
          "url": "https://example.com/relevant-resource",
          "anchor_text": "Descriptive anchor text"
        }
      ]
    },

    "conclusion": "Summary paragraph with call-to-action.",

    "related_keywords": [
      "synonym or related phrase 1",
      "synonym or related phrase 2"
    ],

    "schema_markup": {
      "article_type": "BlogPosting",
      "author": "Your Name or Brand",
      "publisher": "Your Company or Website",
      "datePublished": "YYYY-MM-DD",
      "dateModified": "YYYY-MM-DD"
    }
  }
}

Modify the schema based on intent type:
1. Product/Artwork Valuation:
   - Add price range sections
   - Include market analysis
   - Add value factors
   - Include authentication tips

2. Artist/Creator Biography:
   - Add timeline sections
   - Include notable works
   - Add style evolution
   - Include exhibitions/awards

3. How-to/Guides:
   - Add step-by-step sections
   - Include materials/tools needed
   - Add difficulty level
   - Include time estimates

4. Reviews/Comparisons:
   - Add pros/cons sections
   - Include rating criteria
   - Add alternatives comparison
   - Include price comparisons

IMPORTANT:
- Return ONLY valid JSON
- NO markdown
- NO code blocks
- NO additional text
- Include clear placeholder values
- Structure must match the content needs
- Remove unnecessary sections
- Add relevant sections based on intent`
          }
        ];

        console.log('[CONTENT] Requesting schema from o1-mini');
        const schemaCompletion = await openaiService.openai.createChatCompletion({
          model: 'o1-mini',
          messages: schemaMessages
        });

        const schemaContent = schemaCompletion.data.choices[0].message.content;
        console.log('[CONTENT] Schema generation complete, length:', schemaContent.length);
        console.log('\n[CONTENT] Generated Schema:');
        console.log('----------------------------------------');
        console.log(schemaContent);
        console.log('----------------------------------------\n');

        // Parse and validate the schema
        let contentSchema;
        try {
          contentSchema = JSON.parse(schemaContent);
          console.log('[CONTENT] Successfully parsed schema JSON');
          console.log('[CONTENT] Schema structure:', {
            rootKeys: Object.keys(contentSchema),
            depth: this.getObjectDepth(contentSchema),
            sections: this.getAllKeys(contentSchema)
          });
        } catch (parseError) {
          console.error('[CONTENT] Schema parsing error:', parseError);
          console.error('[CONTENT] Raw schema:', schemaContent);
          throw new Error('Invalid JSON schema from OpenAI');
        }

        // Phase 2: Fill the schema with actual content
        console.log('[CONTENT] Phase 2: Generating content based on schema');
        const contentMessages = [
          {
            role: "assistant",
            content: "You are an expert SEO content creator. Your task is to fill the provided content schema with high-quality, relevant information based on the keyword."
          },
          {
            role: "user",
            content: `Create comprehensive content for the keyword "${data.keyword}" using exactly this JSON schema:

${JSON.stringify(contentSchema, null, 2)}

Requirements:
1. Follow the schema structure exactly
2. Replace all placeholder values with real, relevant content
3. Ensure all content is factual and well-researched
4. Include the keyword naturally throughout the content
5. Maintain proper formatting and HTML where indicated

IMPORTANT:
- Return ONLY valid JSON
- NO markdown
- NO code blocks
- NO additional text
- Must match the schema structure exactly`
          }
        ];

        console.log('[CONTENT] Requesting content from o1-mini');
        const contentCompletion = await openaiService.openai.createChatCompletion({
          model: 'o1-mini',
          messages: contentMessages
        });

        const generatedContent = contentCompletion.data.choices[0].message.content;
        console.log('[CONTENT] Content generation complete, length:', generatedContent.length);
        console.log('\n[CONTENT] Generated Content:');
        console.log('----------------------------------------');
        console.log(generatedContent);
        console.log('----------------------------------------\n');

        // Parse and validate the final content
        let parsedContent;
        try {
          parsedContent = JSON.parse(generatedContent);
          console.log('[CONTENT] Successfully parsed content JSON');
          console.log('[CONTENT] Content validation:', {
            matches_schema: this.validateAgainstSchema(parsedContent, contentSchema),
            sections: this.getAllKeys(parsedContent),
            contentLength: JSON.stringify(parsedContent).length
          });
        } catch (parseError) {
          console.error('[CONTENT] Content parsing error:', parseError);
          console.error('[CONTENT] Raw content:', generatedContent);
          throw new Error('Invalid JSON content from OpenAI');
        }

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
            status: 'success',
            schema: contentSchema,
            content: parsedContent
          }]
        };

        console.log('[CONTENT] Sending successful response');
        return res.json(response);

      } catch (error) {
        console.error('[CONTENT] Error generating content:', {
          error: error.message,
          stack: error.stack,
          keyword: data.keyword
        });

        if (error.response) {
          console.error('[CONTENT] OpenAI API error details:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        }

        const errorResponse = { 
          success: false, 
          error: error.message,
          keyword: data.keyword,
          timestamp: new Date().toISOString()
        };

        console.log('[CONTENT] Sending error response:', errorResponse);
        return res.status(500).json(errorResponse);
      }
    } catch (error) {
      console.error('[CONTENT] Error in process controller:', {
        error: error.message,
        stack: error.stack
      });

      const errorResponse = { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };

      console.log('[CONTENT] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  }

  // Helper method to get object depth
  getObjectDepth(obj, depth = 0) {
    if (!obj || typeof obj !== 'object') {
      return depth;
    }
    return Math.max(
      ...Object.values(obj).map(val => this.getObjectDepth(val, depth + 1))
    );
  }

  // Helper method to validate content against schema
  validateAgainstSchema(content, schema) {
    const schemaKeys = this.getAllKeys(schema);
    const contentKeys = this.getAllKeys(content);
    
    // Check if all schema keys exist in content
    const missingKeys = schemaKeys.filter(key => !contentKeys.includes(key));
    
    console.log('[CONTENT] Schema validation:', {
      schemaKeys: schemaKeys.length,
      contentKeys: contentKeys.length,
      missingKeys
    });

    return missingKeys.length === 0;
  }

  // Helper method to get all keys from nested object
  getAllKeys(obj, prefix = '') {
    return Object.entries(obj).reduce((keys, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [...keys, newKey, ...this.getAllKeys(value, newKey)];
      }
      return [...keys, newKey];
    }, []);
  }
}

module.exports = new ContentController();