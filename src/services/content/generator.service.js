const openaiService = require('../openai.service');
const contentStorage = require('../../utils/storage');

class ContentGeneratorService {
  async generateContent(structure, images) {
    console.log('[CONTENT] Starting detailed content generation');
    
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create detailed content following the provided structure and integrate the provided WordPress images. You MUST return a valid JSON object.

CRITICAL FORMATTING RULES:
1. Return ONLY a JSON object
2. NO markdown code blocks
3. NO extra text before or after the JSON
4. Properly escape all quotes and special characters
5. Use double quotes for all keys and string values

Example of EXACT format required:
{
  "title": "Example Title",
  "slug": "example-slug",
  "meta": {
    "title": "SEO Title",
    "description": "Meta Description",
    "focus_keyword": "keyword"
  },
  "content": {
    "html": "<article><h1>Title</h1></article>"
  }
}

CRITICAL: Return ONLY a valid JSON object with EXACTLY these fields:`
      },
      {
        role: 'user',
        content: `Create detailed content following this structure and integrate these WordPress images. Return ONLY a valid JSON object:

Structure:
${JSON.stringify(structure, null, 2)}

Available Images:
${JSON.stringify(images, null, 2)}

IMPORTANT:
- Return ONLY valid JSON
- NO code blocks or extra text
- Use double quotes for all strings
- Properly escape special characters
- Include WordPress image URLs in the HTML content`
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
      completion.data,
      { type: 'openai_response' }
    );

    const rawContent = completion.data.choices[0].message.content;

    // Store raw content before parsing
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/raw_content.json`,
      { content: rawContent },
      { type: 'raw_content' }
    );

    try {
      // Enhanced cleaning of the response
      const cleanedContent = rawContent
        .replace(/^[\s\S]*?{/, '{')  // Remove everything before first {
        .replace(/}[\s\S]*$/, '}')   // Remove everything after last }
        .replace(/\\n/g, '\\n')      // Escape newlines properly
        .replace(/\\"/g, '\\"')      // Escape quotes properly
        .replace(/`/g, "'")          // Replace backticks with single quotes
        .replace(/\t/g, '    ')      // Replace tabs with spaces
        .trim();

      console.log('[CONTENT] Attempting to parse cleaned content');
      
      // Try parsing with additional error context
      let parsedContent;
      try {
        parsedContent = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('[CONTENT] Parse error details:', {
          error: parseError.message,
          position: parseError.message.match(/position (\d+)/)?.[1],
          snippet: parseError.message.match(/position \d+/) 
            ? cleanedContent.substring(
                Math.max(0, parseInt(parseError.message.match(/position (\d+)/)[1]) - 20),
                parseInt(parseError.message.match(/position (\d+)/)[1]) + 20
              )
            : 'No position information'
        });
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

      // Store error details with more context
      await contentStorage.storeContent(
        `seo/keywords/${structure.slug}/parsing_error.json`,
        {
          error: {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
          },
          rawContent,
          cleanedContent: rawContent
            .replace(/^[\s\S]*?{/, '{')
            .replace(/}[\s\S]*$/, '}')
            .trim()
        },
        { type: 'parsing_error' }
      );

      throw new Error(`Failed to parse content: ${error.message}`);
    }
  }
}

module.exports = new ContentGeneratorService();