const openaiService = require('./openai.service');
const wordpressService = require('./wordpress');
const contentStorage = require('../utils/storage');

class ContentGenerationService {
  async generateContent(keyword) {
    console.log('[CONTENT] Generating content for keyword:', keyword);
    
    const structure = await this.generateInitialStructure(keyword);
    const images = await this.generateAndUploadImages(structure);
    const content = await this.generateDetailedContent(structure, images);
    
    return content;
  }

  async generateInitialStructure(keyword) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content planner. Create a content structure and image requirements for the given keyword.

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
  ],
  "images": [
    {
      "type": "featured",
      "description": "Detailed description for DALL-E",
      "alt": "SEO-optimized alt text",
      "placement": "Featured image position"
    },
    {
      "type": "content",
      "description": "Detailed description for DALL-E",
      "alt": "SEO-optimized alt text",
      "placement": "After introduction"
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
- Plan strategic image placement
- Write detailed image descriptions
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

  async generateAndUploadImages(structure) {
    const uploadedImages = [];

    for (const imageReq of structure.images) {
      try {
        // Generate image using DALL-E
        console.log('[CONTENT] Generating image:', imageReq.description);
        const imageResult = await openaiService.generateImage(imageReq.description);

        // Upload to WordPress
        console.log('[CONTENT] Uploading image to WordPress');
        const uploadResult = await wordpressService.uploadImage(imageResult.url);

        uploadedImages.push({
          ...imageReq,
          url: uploadResult.url,
          wordpress_id: uploadResult.id,
          wordpress_url: uploadResult.source_url
        });

        // Store success in logs
        await this.logImageOperation('success', imageReq, uploadResult);
      } catch (error) {
        console.error('[CONTENT] Error with image:', error);
        await this.logImageOperation('error', imageReq, error);
      }
    }

    return uploadedImages;
  }

  async generateDetailedContent(structure, images) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create detailed content following the provided structure and integrate the provided WordPress images.

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
    "html": "Full HTML content with integrated WordPress image URLs"
  }
}`
      },
      {
        role: 'user',
        content: `Create detailed content following this structure and integrate these WordPress images:

Structure:
${JSON.stringify(structure, null, 2)}

Available Images:
${JSON.stringify(images, null, 2)}

IMPORTANT:
- Return ONLY valid JSON
- Create engaging content
- Use semantic HTML
- Include WordPress image URLs in the HTML content
- Place images according to their specified placement
- Use provided alt text
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

module.exports = ContentGenerationService;