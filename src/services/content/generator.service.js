const openaiService = require('../openai.service');
const contentStorage = require('../../utils/storage');

class ContentGeneratorService {
  async generateContent(structure, images) {
    console.log('[CONTENT] Starting detailed content generation');
    
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create comprehensive, high-quality content that fully addresses user intent for the given topic. Your content should be detailed, well-structured, and optimized for both users and search engines.

CRITICAL REQUIREMENTS:
1. Create long-form, authoritative content
2. Use proper HTML semantic structure
3. Include schema.org markup
4. Integrate provided WordPress images naturally
5. Optimize for featured snippets
6. Include clear calls-to-action

Your response must be a valid JSON object with these fields:
{
  "title": "SEO-optimized title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO meta title",
    "description": "Meta description with call-to-action",
    "focus_keyword": "primary keyword"
  },
  "content": {
    "html": "Full HTML content with integrated WordPress image URLs"
  }
}

IMPORTANT HTML GUIDELINES:
1. Use semantic HTML5 elements (article, section, header, etc.)
2. Create proper heading hierarchy (h1-h6)
3. Include schema.org markup in script tags
4. Format images with proper classes:
   <img src="[url]" alt="[alt]" class="wp-image aligncenter" style="max-width: 800px; height: auto;">
5. Add descriptive captions under images
6. Include table of contents for long content
7. Use proper formatting for lists, quotes, and tables

Return ONLY valid JSON with no additional text or formatting.`
      },
      {
        role: 'user',
        content: `Create comprehensive content using these WordPress images. Return ONLY a valid JSON object:

Structure:
${JSON.stringify(structure, null, 2)}

Available Images:
${JSON.stringify(images, null, 2)}

IMPORTANT:
- Create detailed, valuable content
- Use proper HTML structure
- Integrate images naturally
- Include schema.org markup
- Focus on user intent and value`
      }
    ];

    // Store the input state
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/detailed_content_input.json`,
      { structure, images },
      { type: 'detailed_content_input' }
    );

    console.log('[CONTENT] Sending request to OpenAI');
    const completion = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages,
      temperature: 0.7, // Add some creativity while maintaining quality
      max_tokens: 4000  // Allow for longer content
    });

    // Store raw OpenAI response
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/openai_response.json`,
      {
        response: completion.data,
        timestamp: new Date().toISOString()
      },
      { type: 'openai_response' }
    );

    let rawContent = completion.data.choices[0].message.content;

    // Store raw content before parsing
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/raw_content.json`,
      {
        original: rawContent,
        timestamp: new Date().toISOString()
      },
      { type: 'raw_content' }
    );

    try {
      // Enhanced cleaning of the response
      let cleanedContent = rawContent
        .replace(/^```json\s*/gm, '')  // Remove JSON code block markers at start
        .replace(/```\s*$/gm, '')      // Remove code block markers at end
        .replace(/^\s+|\s+$/g, '')     // Trim whitespace
        .trim();

      // Store cleaned content before parsing
      await contentStorage.storeContent(
        `seo/keywords/${structure.slug}/cleaned_content.json`,
        {
          cleaned: cleanedContent,
          timestamp: new Date().toISOString()
        },
        { type: 'cleaned_content' }
      );

      // Ensure the content starts with { and ends with }
      if (!cleanedContent.startsWith('{') || !cleanedContent.endsWith('}')) {
        console.error('[CONTENT] Invalid JSON structure:', cleanedContent);
        throw new Error('Invalid JSON structure');
      }

      console.log('[CONTENT] Attempting to parse cleaned content');
      
      // Try parsing the cleaned content
      let parsedContent;
      try {
        parsedContent = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('[CONTENT] Parse error:', parseError.message);
        console.error('[CONTENT] Cleaned content:', cleanedContent);

        // Store parse error details
        await contentStorage.storeContent(
          `seo/keywords/${structure.slug}/parse_error.json`,
          {
            error: parseError.message,
            rawContent,
            cleanedContent,
            timestamp: new Date().toISOString()
          },
          { type: 'parse_error' }
        );

        throw parseError;
      }

      // Validate required fields
      if (!parsedContent.title || typeof parsedContent.title !== 'string') {
        throw new Error('Invalid content: missing or invalid title');
      }
      if (!parsedContent.content?.html || typeof parsedContent.content.html !== 'string') {
        throw new Error('Invalid content: missing or invalid HTML content');
      }
      if (!parsedContent.meta?.title || typeof parsedContent.meta.title !== 'string') {
        throw new Error('Invalid content: missing or invalid meta title');
      }

      // Process image sizes and formatting
      if (images && images.length > 0) {
        parsedContent.content.html = this.processImageFormatting(parsedContent.content.html);
      }

      // Store successful parsed content
      await contentStorage.storeContent(
        `seo/keywords/${structure.slug}/parsed_content.json`,
        parsedContent,
        { type: 'parsed_content' }
      );

      return parsedContent;
    } catch (error) {
      console.error('[CONTENT] Error parsing content:', error);
      console.error('[CONTENT] Raw content:', rawContent);

      // Store complete error details
      await contentStorage.storeContent(
        `seo/keywords/${structure.slug}/parsing_error.json`,
        {
          error: {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
            response: error.response?.data
          },
          rawContent,
          timestamp: new Date().toISOString()
        },
        { type: 'parsing_error' }
      );

      throw error;
    }
  }

  processImageFormatting(html) {
    // Add proper image formatting and responsive classes
    return html.replace(
      /<img([^>]*)>/g,
      '<img$1 class="wp-image aligncenter" style="max-width: 800px; height: auto;">'
    );
  }
}

module.exports = new ContentGeneratorService();