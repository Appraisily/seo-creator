const openaiService = require('./openai.service');
const contentStorage = require('../utils/storage');

class ComposerService {
  async composeHtml(contentJson) {
    try {
      console.log('[COMPOSER] Starting HTML composition');
      console.log('[COMPOSER] Content JSON size:', JSON.stringify(contentJson).length);
      
      // Initialize conversation with the agent
      const conversation = [
        {
          role: 'assistant',
          content: `You are an expert WordPress content composer specializing in SEO-optimized articles. Your task is to transform the provided content into a structured WordPress post format.

CRITICAL: You MUST return a valid JSON object with EXACTLY these fields:

{
  "title": "SEO-optimized post title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO meta title",
    "description": "Compelling meta description",
    "focus_keyword": "primary keyword"
  },
  "content": {
    "html": "Full HTML content with semantic markup"
  },
  "images": [
    {
      "url": "placeholder",
      "alt": "descriptive alt text"
    }
  ]
}

Key Requirements:
1. Follow the JSON structure EXACTLY - include ONLY the specified fields
2. Create semantic, accessible HTML content
3. Include placeholder image objects with descriptive alt text
4. Optimize all elements for SEO

Image Guidelines:
- Include placeholders for a featured image and section illustrations
- Provide detailed alt text for each image
- Plan for 3-4 strategic image placements

SEO Requirements:
- Include focus keyword in title, meta title, and first paragraph
- Create compelling meta descriptions with call-to-action
- Use semantic HTML5 elements (article, section, etc.)
- Structure content with proper heading hierarchy`
        },
        {
          role: 'user',
          content: `Transform this content into a WordPress post format:
${JSON.stringify(contentJson, null, 2)}

IMPORTANT:
- Return ONLY valid JSON with EXACTLY the specified fields
- Include image placeholders with descriptive alt text
- Optimize for SEO
- Use semantic HTML5 markup`
        }
      ];

      console.log('[COMPOSER] Starting conversation with AI agent');
      let currentMessage = await openaiService.openai.createChatCompletion({
        model: 'o3-mini',
        messages: conversation
      });

      let response = currentMessage.data.choices[0].message;

      // Parse the response
      console.log('[COMPOSER] Agent completed task, parsing response');
      let composedContent;
      try {
        composedContent = JSON.parse(response.content);
        console.log('[COMPOSER] Successfully parsed response');
      } catch (error) {
        console.error('[COMPOSER] Error parsing response:', error);
        console.error('[COMPOSER] Raw response:', response.content);
        throw new Error('Invalid JSON response from agent');
      }

      // Generate images based on alt text
      console.log('[COMPOSER] Starting image generation phase');
      const enhancedContent = await this.generateImagesForContent(composedContent);

      return {
        success: true,
        ...enhancedContent
      };

    } catch (error) {
      console.error('[COMPOSER] Error in composition process:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw error;
    }
  }

  async generateImagesForContent(content) {
    try {
      console.log('[COMPOSER] Generating images for content');
      const generatedImages = [];

      // Process each image placeholder
      for (const image of content.images) {
        console.log('[COMPOSER] Generating image from alt text:', image.alt);

        // Log image generation request
        const logEntry = {
          timestamp: new Date().toISOString(),
          event: 'image_generation_request',
          prompt: image.alt,
          size: '1024x1024'
        };

        await contentStorage.storeContent(
          `seo/logs/image_generation/${new Date().toISOString().split('T')[0]}/requests.json`,
          logEntry,
          {
            type: 'image_generation_log',
            timestamp: logEntry.timestamp
          }
        );

        // Generate image using the alt text as prompt
        const imageResult = await openaiService.generateImage(image.alt);
        console.log('[COMPOSER] Image generated:', imageResult.url);

        // Log successful generation
        const successLogEntry = {
          ...logEntry,
          event: 'image_generation_success',
          url: imageResult.url
        };

        await contentStorage.storeContent(
          `seo/logs/image_generation/${new Date().toISOString().split('T')[0]}/success.json`,
          successLogEntry,
          {
            type: 'image_generation_log',
            timestamp: new Date().toISOString()
          }
        );

        // Add generated image to the list
        generatedImages.push({
          url: imageResult.url,
          alt: image.alt
        });
      }

      // Replace placeholder images with generated ones
      content.images = generatedImages;

      // Log generation summary
      const summaryLogEntry = {
        timestamp: new Date().toISOString(),
        event: 'image_generation_summary',
        total_images_generated: generatedImages.length,
        images: generatedImages
      };

      await contentStorage.storeContent(
        `seo/logs/image_generation/${new Date().toISOString().split('T')[0]}/summary.json`,
        summaryLogEntry,
        {
          type: 'image_generation_summary',
          timestamp: summaryLogEntry.timestamp
        }
      );

      return content;
    } catch (error) {
      // Log error
      const errorLogEntry = {
        timestamp: new Date().toISOString(),
        event: 'image_generation_error',
        error: {
          message: error.message,
          stack: error.stack
        }
      };

      await contentStorage.storeContent(
        `seo/logs/image_generation/${new Date().toISOString().split('T')[0]}/errors.json`,
        errorLogEntry,
        {
          type: 'image_generation_error',
          timestamp: errorLogEntry.timestamp
        }
      );

      throw error;
    }
  }
}

module.exports = new ComposerService();