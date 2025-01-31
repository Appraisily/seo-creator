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
            content: "You are an expert at analyzing search intent and creating optimal content structures. Your task is to create a schema template with clear instructions for each section based on the keyword's intent."
          },
          {
            role: "user",
            content: `Analyze this keyword: "${data.keyword}"

For this KW we need a JSON structure of the best posible SEO article to rank exceptional on Google. You have to create the structure of the JSON with what you think it will be the best structure for the given KW. You can change the JSON structure, in fact, it is encouraged. The idea is you have total flexibility to change this, but keeping it in a JSON format that matches what you would expect for a wordpress post.

Example schema structure (DO NOT copy exactly - adapt based on intent):

{
  "schema_info": {
    "intent_type": "Describe the primary search intent (e.g., valuation, biography, how-to)",
    "content_goal": "Explain what the content should achieve",
    "target_audience": "Define who this content is for",
    "key_focus_areas": [
      "List main topics that must be covered",
      "Based on search intent"
    ]
  },
  "content_structure": {
    "title": {
      "format": "How the title should be structured",
      "requirements": [
        "List specific requirements for the title",
        "E.g., include keyword, length limits"
      ],
      "examples": [
        "Example title formats"
      ]
    },
    "meta_description": {
      "format": "How to structure the meta description",
      "requirements": [
        "List meta description requirements",
        "E.g., length, keyword placement"
      ]
    },
    "sections": [
      {
        "name": "Section name",
        "purpose": "What this section should achieve",
        "required_elements": [
          "List what must be included"
        ],
        "guidelines": [
          "Specific instructions for writing this section"
        ]
      }
    ]
  }
}

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
        console.log('\n[CONTENT] Generated Schema Template:');
        console.log('----------------------------------------');
        console.log(schemaContent);
        console.log('----------------------------------------\n');

        // Parse and validate the schema
        let contentSchema;
        try {
          contentSchema = JSON.parse(schemaContent);
          console.log('[CONTENT] Successfully parsed schema template');
          console.log('[CONTENT] Schema structure:', {
            rootKeys: Object.keys(contentSchema),
            depth: this.getObjectDepth(contentSchema),
            sections: this.getAllKeys(contentSchema)
          });
        } catch (parseError) {
          console.error('[CONTENT] Schema parsing error:', parseError);
          console.error('[CONTENT] Raw schema:', schemaContent);
          throw new Error('Invalid JSON schema template from OpenAI');
        }

        // Phase 2: Fill the schema with actual content
        console.log('[CONTENT] Phase 2: Generating content based on schema template');
        const contentMessages = [
          {
            role: "assistant",
            content: "You are an expert SEO content creator. Your task is to create content following the provided schema template and its instructions."
          },
          {
            role: "user",
            content: `Create comprehensive content for the keyword "${data.keyword}" following this schema template and its instructions:

${JSON.stringify(contentSchema, null, 2)}

Requirements:
1. Follow ALL instructions in the schema template
2. Create content that matches each section's requirements
3. Ensure content meets the specified goals and guidelines
4. Include the keyword naturally throughout
5. Follow any formatting requirements specified

IMPORTANT:
- Return ONLY valid JSON
- Follow the schema structure exactly
- Create content that fulfills each section's purpose
- NO markdown
- NO code blocks
- NO additional text`
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
            schema_template: contentSchema,
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

  // Helper methods remain unchanged
  getObjectDepth(obj, depth = 0) {
    if (!obj || typeof obj !== 'object') {
      return depth;
    }
    return Math.max(
      ...Object.values(obj).map(val => this.getObjectDepth(val, depth + 1))
    );
  }

  validateAgainstSchema(content, schema) {
    const schemaKeys = this.getAllKeys(schema);
    const contentKeys = this.getAllKeys(content);
    
    const missingKeys = schemaKeys.filter(key => !contentKeys.includes(key));
    
    console.log('[CONTENT] Schema validation:', {
      schemaKeys: schemaKeys.length,
      contentKeys: contentKeys.length,
      missingKeys
    });

    return missingKeys.length === 0;
  }

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