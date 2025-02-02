const openaiService = require('../openai.service');
const contentStorage = require('../../utils/storage');

class ContentStructureService {
  async generateStructure(keyword) {
    const messages = [
      {
        role: 'assistant',
        content: `You are an expert SEO content planner. Analyze the keyword and create an optimal content structure that best serves user intent.

Your response must be a valid JSON object. The only strictly required field is the "images" array which must follow this format:

{
  ... (structure the content however you think best serves the user) ...

  "images": [
    {
      "type": "featured | content",
      "description": "Detailed description for DALL-E image generation",
      "alt": "SEO-optimized alt text",
      "placement": "Where this image should appear in the content"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Analyze User Intent:
   - Understand what users are looking for
   - Consider search context and user needs
   - Plan content that fully addresses the topic

2. Content Organization:
   - Structure content in the most logical way
   - Include all necessary sections
   - Use clear hierarchical organization

3. Image Planning:
   - Plan strategic image placement
   - Write detailed DALL-E prompts
   - Ensure images enhance content value

4. SEO Optimization:
   - Include SEO metadata
   - Use proper content hierarchy
   - Plan for featured snippets

Return ONLY valid JSON with no additional text or formatting.`
      },
      {
        role: 'user',
        content: `Create an optimal content structure for: "${keyword}"

IMPORTANT:
- Return valid JSON
- Structure based on user intent
- Include required images array
- Focus on value and comprehensiveness`
      }
    ];

    const completion = await openaiService.openai.createChatCompletion({
      model: 'o3-mini',
      messages
    });

    const structure = JSON.parse(completion.data.choices[0].message.content);

    // Validate required images array
    if (!structure.images || !Array.isArray(structure.images)) {
      throw new Error('Invalid structure: missing or invalid images array');
    }

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