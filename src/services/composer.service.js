const openaiService = require('./openai.service');
const contentStorage = require('../utils/storage');
const wordpressService = require('./wordpress');

class ComposerService {
  async composeHtml(contentJson) {
    try {
      console.log('[COMPOSER] Starting HTML composition');
      console.log('[COMPOSER] Content JSON size:', JSON.stringify(contentJson).length);
      
      // First, generate the initial structure to get image requirements
      const initialStructure = await this.generateInitialStructure(contentJson);
      
      // Generate and upload images first
      console.log('[COMPOSER] Starting image generation and upload phase');
      const wordpressImages = await this.generateAndUploadImages(initialStructure.images);

      // Now generate the final HTML with WordPress image URLs
      console.log('[COMPOSER] Generating final HTML with WordPress image URLs');
      const finalContent = await this.generateFinalHtml(contentJson, wordpressImages);

      return {
        success: true,
        ...finalContent
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

  async generateInitialStructure(contentJson) {
    const conversation = [
      {
        role: 'assistant',
        content: `You are an expert content planner. Your task is to analyze the content and plan the required images.

CRITICAL: Return ONLY a valid JSON object with EXACTLY these fields:
{
  "title": "Post title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO title",
    "description": "Meta description",
    "focus_keyword": "primary keyword"
  },
  "images": [
    {
      "type": "featured", // or "content"
      "alt": "Detailed description for image generation",
      "section": "Section name or position where image will be used"
    }
  ]
}

Image Planning Requirements:
1. Featured image MUST be first in the images array
2. Plan 3-4 strategic content images
3. Write detailed alt text that can be used as DALL-E prompts
4. Indicate where each image will be placed`
      },
      {
        role: 'user',
        content: `Plan the image structure for this content:
${JSON.stringify(contentJson, null, 2)}

IMPORTANT:
- Return ONLY valid JSON
- Include detailed image descriptions
- Plan strategic image placement`
      }
    ];

    const response = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages: conversation
    });

    return JSON.parse(response.data.choices[0].message.content);
  }

  async generateAndUploadImages(imagePlans) {
    const uploadedImages = [];

    for (const imagePlan of imagePlans) {
      try {
        // Generate image using DALL-E
        console.log('[COMPOSER] Generating image:', imagePlan.alt);
        const imageResult = await openaiService.generateImage(imagePlan.alt);

        // Upload to WordPress
        console.log('[COMPOSER] Uploading image to WordPress');
        const uploadResult = await wordpressService.uploadImage(imageResult.url);

        uploadedImages.push({
          ...imagePlan,
          url: uploadResult.url,
          wordpress_id: uploadResult.id,
          wordpress_url: uploadResult.source_url
        });

        // Log successful upload
        await this.logImageOperation('success', imagePlan, uploadResult);
      } catch (error) {
        console.error('[COMPOSER] Error with image:', error);
        await this.logImageOperation('error', imagePlan, error);
        // Continue with other images even if one fails
      }
    }

    return uploadedImages;
  }

  async generateFinalHtml(contentJson, wordpressImages) {
    const conversation = [
      {
        role: 'assistant',
        content: `You are an expert WordPress content composer. Create HTML content using the provided WordPress image URLs.

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
    "html": "Full HTML content with WordPress image URLs"
  }
}

IMPORTANT:
- The provided WordPress image URLs are already uploaded and ready to use
- Use the URLs directly in the HTML content
- NO separate images array needed - embed URLs directly in HTML
- Create semantic HTML structure
- Include schema.org markup
- Optimize for SEO`
      },
      {
        role: 'user',
        content: `Create the final HTML using these WordPress images:
${JSON.stringify(wordpressImages, null, 2)}

Original content:
${JSON.stringify(contentJson, null, 2)}

IMPORTANT:
- Use the WordPress image URLs (wordpress_url) directly in the HTML
- Create semantic HTML structure
- Include schema.org markup
- Optimize for SEO
- NO separate images array needed`
      }
    ];

    const response = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages: conversation
    });

    return JSON.parse(response.data.choices[0].message.content);
  }

  async logImageOperation(status, imagePlan, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status,
      image_plan: imagePlan,
      result: status === 'success' ? {
        wordpress_id: result.id,
        wordpress_url: result.source_url
      } : {
        error: result.message,
        details: result.response?.data
      }
    };

    await contentStorage.storeContent(
      `seo/logs/image_operations/${new Date().toISOString().split('T')[0]}/${status}.json`,
      logEntry,
      {
        type: 'image_operation_log',
        timestamp: logEntry.timestamp
      }
    );
  }
}

module.exports = new ComposerService();