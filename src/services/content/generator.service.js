const openaiService = require('../openai.service');
const contentStorage = require('../../utils/storage');

class ContentGeneratorService {
  async generateContent(structure, images) {
    console.log('[CONTENT] Starting detailed content generation');
    
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create comprehensive, high-quality content that fully addresses user intent for the given topic.

CRITICAL REQUIREMENTS:
1. Create long-form, authoritative content
2. Use proper HTML semantic structure
3. Include schema.org markup
4. Integrate provided WordPress images naturally
5. Optimize for featured snippets
6. Include clear calls-to-action

Your response must be a valid JSON object with EXACTLY these fields:
{
  "title": "SEO-optimized title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO meta title",
    "description": "Meta description with call-to-action",
    "focus_keyword": "primary keyword"
  },
  "content": {
    "html": "COMPLETE HTML CONTENT HERE - ALL HTML MUST BE IN THIS SINGLE FIELD"
  }
}

IMPORTANT HTML GUIDELINES:
1. Put ALL HTML content in the content.html field
2. Use semantic HTML5 elements (article, section, header, etc.)
3. Create proper heading hierarchy (h1-h6)
4. Include schema.org markup in script tags
5. Format images with proper classes:
   <img src="[url]" alt="[alt]" class="wp-image aligncenter" style="max-width: 800px; height: auto;">
6. Add descriptive captions under images
7. Include table of contents for long content
8. Use proper formatting for lists, quotes, and tables

CRITICAL: DO NOT split content into sections. Put ALL HTML in the content.html field.
Return ONLY valid JSON with no additional text or formatting.`
      },
      {
        role: 'user',
        content: `Create comprehensive content using these WordPress images.

CRITICAL: Return ONLY a valid JSON object with ALL HTML in the content.html field.

Structure:
${JSON.stringify(structure, null, 2)}

Available Images:
${JSON.stringify(images, null, 2)}

IMPORTANT:
- Create detailed, valuable content
- Put ALL HTML in content.html field
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
      messages
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
      this.validateContent(parsedContent);

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

  validateContent(content) {
    if (!content.title || typeof content.title !== 'string') {
      throw new Error('Invalid content: missing or invalid title');
    }

    if (!content.content?.html || typeof content.content.html !== 'string') {
      throw new Error('Invalid content: missing or invalid HTML content');
    }
    
    if (!content.meta?.title || typeof content.meta.title !== 'string') {
      throw new Error('Invalid content: missing or invalid meta title');
    }
  }

  stripHtmlTags(html) {
    return html.replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }

  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = new ContentGeneratorService();