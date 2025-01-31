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
      // Get next unprocessed keyword
      console.log('[CONTENT] Fetching next unprocessed keyword from sheets');
      const data = await sheetsService.getNextUnprocessedPost();
      
      if (!data) {
        console.log('[CONTENT] No unprocessed keywords found');
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
      console.log('[CONTENT] Row data:', {
        rowNumber: data.rowNumber,
        keyword: data.keyword
      });

      try {
        console.log('[CONTENT] Preparing OpenAI request');
        
        // Create completion with o1-mini
        const messages = [
          {
            role: "system",
            content: "You are an expert SEO content creator. Your task is to create comprehensive, SEO-optimized blog post content based on the provided keyword. Return ONLY valid JSON matching the specified structure."
          },
          {
            role: "user",
            content: `Create a comprehensive blog post structure for the keyword: "${data.keyword}". 
              
Return it in this EXACT JSON format:

{
  "post": {
    "keyword": "${data.keyword}",
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
      },
      {
        "heading": "Another H2 or H3 Subheading – Further Breakdown of Topic",
        "content": "More paragraphs. Incorporate synonyms and LSI keywords."
      }
    ],
    
    "faq_section": [
      {
        "question": "Related FAQ #1",
        "answer": "Short, concise answer referencing your keyword naturally."
      },
      {
        "question": "Related FAQ #2",
        "answer": "Another useful FAQ answer."
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

    "conclusion": "Summary paragraph, reusing your primary keyword naturally and inviting a call-to-action.",

    "related_keywords": [
      "synonym or related phrase 1",
      "synonym or related phrase 2",
      "synonym or related phrase 3"
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

IMPORTANT: 
- Return ONLY valid JSON
- NO markdown
- NO code blocks
- NO additional text
- Must match the exact structure shown above`
          }
        ];

        console.log('[CONTENT] OpenAI request configuration:', {
          model: 'o1-mini',
          messagesCount: messages.length,
          keyword: data.keyword
        });

        const completion = await openaiService.openai.createChatCompletion({
          model: 'o1-mini',
          messages
        });

        console.log('[CONTENT] OpenAI response received:', {
          finishReason: completion.data.choices[0].finish_reason,
          promptTokens: completion.data.usage?.prompt_tokens,
          completionTokens: completion.data.usage?.completion_tokens,
          totalTokens: completion.data.usage?.total_tokens
        });

        const generatedContent = completion.data.choices[0].message.content;
        console.log('[CONTENT] Generated content length:', generatedContent.length);

        // Parse the response to verify it's valid JSON
        console.log('[CONTENT] Attempting to parse response as JSON');
        let parsedContent;
        try {
          parsedContent = JSON.parse(generatedContent);
          console.log('[CONTENT] Successfully parsed JSON response');
          console.log('[CONTENT] Parsed content structure:', {
            hasPost: !!parsedContent.post,
            hasKeyword: !!parsedContent.post?.keyword,
            sections: Object.keys(parsedContent.post || {})
          });
        } catch (parseError) {
          console.error('[CONTENT] JSON parsing error:', parseError);
          console.error('[CONTENT] Raw content:', generatedContent);
          throw new Error('Invalid JSON response from OpenAI');
        }
        
        // Debug: Log the full parsed content
        console.log('[CONTENT] Full parsed content:', JSON.stringify(parsedContent, null, 2));
        
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
}

module.exports = new ContentController();