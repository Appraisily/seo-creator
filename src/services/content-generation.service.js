const openaiService = require('./openai.service');
const composerService = require('./composer.service');
const contentStorage = require('../utils/storage');

class ContentGenerationService {
  async generateContent(keyword) {
    console.log('[CONTENT] Generating content for keyword:', keyword);
    
    // Generate initial structure
    const structure = await this.generateInitialStructure(keyword);
    
    // Generate detailed content
    const content = await this.generateDetailedContent(structure);
    
    return content;
  }

  async composeHtml(keyword) {
    console.log('[CONTENT] Composing HTML for keyword:', keyword);
    
    // Create slug from keyword
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Get the content JSON
    const contentPath = `seo/keywords/${slug}/content.json`;
    const content = await contentStorage.getContent(contentPath);
    
    // Compose HTML with images
    return await composerService.composeHtml(content);
  }

  async generateInitialStructure(keyword) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content planner. Create a content structure for the given keyword.

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

  async generateDetailedContent(structure) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content writer. Create detailed content following the provided structure.

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
    "html": "Full HTML content"
  }
}`
      },
      {
        role: 'user',
        content: `Create detailed content following this structure:
${JSON.stringify(structure, null, 2)}

IMPORTANT:
- Return ONLY valid JSON
- Create engaging content
- Use semantic HTML
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
}

module.exports = ContentGenerationService;