const openaiService = require('../openai.service');
const contentStorage = require('../../utils/storage');

class ContentStructureService {
  async generateStructure(keyword) {
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

    const structure = JSON.parse(completion.data.choices[0].message.content);

    // Store the structure
    await contentStorage.storeContent(
      `seo/keywords/${structure.slug}/structure.json`,
      structure,
      { type: 'structure', keyword }
    );

    return structure;
  }
}

module.exports = new ContentStructureService();