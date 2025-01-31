const openaiService = require('./openai.service');
const contentStorage = require('../utils/storage');

class ContentService {
  async enhanceContent(post, keyword) {
    try {
      console.log(`[CONTENT] Starting enhancement process for post ${post.id} with keyword "${keyword}"`);
      
      // Store original content
      console.log('[CONTENT] Storing original content');
      await contentStorage.storeContent(post.id, post, 'original');

      // First enhancement (v1)
      console.log('[CONTENT] Starting first enhancement (v1)');
      const v1Prompt = this.createV1Prompt(post.content, keyword);
      const v1Content = await openaiService.enhanceContent(v1Prompt, keyword, 'v1');
      
      if (!v1Content) {
        throw new Error('Failed to create v1 enhancement');
      }

      // Create v1 enhanced post
      const v1Post = {
        ...post,
        content: v1Content,
        enhanced_at: new Date().toISOString()
      };

      // Store v1 version
      console.log('[CONTENT] Storing v1 enhanced content');
      await contentStorage.storeContent(post.id, v1Post, 'enhanced');

      // Second enhancement (v2)
      console.log('[CONTENT] Starting second enhancement (v2)');
      const v2Prompt = this.createV2Prompt(v1Content);
      const v2Content = await openaiService.enhanceContent(v2Prompt, keyword, 'v2');

      if (!v2Content) {
        throw new Error('Failed to create v2 enhancement');
      }

      // Create v2 enhanced post
      const v2Post = {
        ...post,
        content: v2Content,
        enhanced_at: new Date().toISOString()
      };

      // Store v2 version
      console.log('[CONTENT] Storing v2 enhanced content');
      await contentStorage.storeContent(post.id, v2Post, 'enhanced-v2');

      // Third enhancement (v3) using o1-mini model
      console.log('[CONTENT] Starting third enhancement (v3)');
      const v3Prompt = this.createV3Prompt(v2Content);
      const v3Response = await openaiService.enhanceContent(v3Prompt, keyword, 'v3');

      if (!v3Response) {
        throw new Error('Failed to create v3 enhancement');
      }

      // Store raw v3 response before parsing
      console.log('[CONTENT] Storing raw v3 response');
      await contentStorage.storeContent(post.id, {
        raw_response: v3Response,
        timestamp: new Date().toISOString(),
        keyword
      }, 'raw-v3-response');

      let v3Data;
      try {
        // Clean the response to handle various formats
        const cleanedResponse = v3Response
          .replace(/^```json\s*/gm, '')  // Remove JSON code block markers at start of any line
          .replace(/```\s*$/gm, '')      // Remove code block markers at end of any line
          .replace(/^\s+|\s+$/g, '');    // Trim whitespace

        // Log the cleaned response for debugging
        console.log('[CONTENT] Cleaned v3 response:', cleanedResponse);
        
        v3Data = JSON.parse(cleanedResponse);
        console.log('[CONTENT] Successfully parsed v3 response');
      } catch (error) {
        console.error('[CONTENT] Failed to parse v3 response:', error);
        console.error('[CONTENT] Raw v3 response:', v3Response);
        
        // Try parsing with escaped newlines
        try {
          const escapedResponse = v3Response.replace(/\n/g, '\\n');
          v3Data = JSON.parse(escapedResponse);
          console.log('[CONTENT] Successfully parsed escaped v3 response');
        } catch (secondError) {
          console.error('[CONTENT] Failed to parse escaped v3 response:', secondError);
          throw new Error('Invalid v3 response format');
        }
      }

      // Validate required fields
      if (!v3Data.content || typeof v3Data.content !== 'string') {
        throw new Error('Invalid v3 data: missing or invalid content field');
      }
      if (!v3Data.meta_title || typeof v3Data.meta_title !== 'string') {
        throw new Error('Invalid v3 data: missing or invalid meta_title field');
      }
      if (!v3Data.meta_description || typeof v3Data.meta_description !== 'string') {
        throw new Error('Invalid v3 data: missing or invalid meta_description field');
      }

      // Create v3 enhanced post
      const v3Post = {
        ...post,
        content: v3Data.content,
        meta_title: v3Data.meta_title,
        meta_description: v3Data.meta_description,
        enhanced_at: new Date().toISOString()
      };

      // Store v3 version
      console.log('[CONTENT] Storing v3 enhanced content');
      await contentStorage.storeContent(post.id, v3Post, 'enhanced-v3');

      return v3Post;
    } catch (error) {
      console.error(`[CONTENT] Error enhancing content for post ${post.id}:`, error);
      throw error;
    }
  }

  createV1Prompt(content, keyword) {
    return `You are an expert content enhancer. Your task is to enhance the following WordPress post content by adding a section about our free screening tool. The post is about ${keyword}.

Key Requirements:
1. Maintain the existing HTML structure and formatting
2. Add a new section titled "Instant Antique & Art Valuation: Meet Our Free Screening Tool" after the introduction
3. Include clear CTAs directing to https://appraisily.com/screener
4. Keep the overall tone and style consistent with the original content
5. Ensure the new section flows naturally with the existing content

Specific Section Requirements:
- Highlight the tool's benefits: instant insights, free usage, no sign-up needed
- Mention photo upload capability and automatic detection of attributes
- Include preliminary valuation range feature
- Add email capture for detailed reports
- Make CTAs compelling but not overly promotional

Original Content:
${content}

Please enhance this content by adding the new screener tool section after the introduction but before the main content sections. Return only the enhanced content, maintaining all HTML formatting.`;
  }

  createV2Prompt(v1Content) {
    return `You are a content editor. Your task is to enhance the following content by emphasizing our screening tool's benefits and adding an FAQ section.

Key Requirements:
1. Emphasize Benefits and Ease of Use:
   - No sign-up required
   - Immediate AI-driven insights
   - Confidence in next steps

2. Add References Throughout:
   - When discussing identification, appraisal, or valuation, add brief references to the free screener
   - Example: "Before diving into thorough identification, try our free screener. It can detect preliminary indicators like potential maker's marks, estimated era of origin, etc."
   - Include multiple natural invitations to use the tool

3. Add FAQ Section:
   Include these Q&As near the end:
   - How accurate is the free antique screening tool?
   - Do I need special equipment to upload a photo?
   - What if I'm unsure whether my decanter is valuable?
   - How do I proceed if my item is worth more than $250?

Guidelines:
- Maintain SEO-friendly keywords
- Keep friendly, natural tone
- Preserve existing structure
- Only add/enhance content

Original Content:
${v1Content}

Return only the enhanced content with all HTML formatting preserved.`;
  }

  createV3Prompt(v2Content) {
    return `You are a content editor. Your task is to enhance the following content with SEO optimizations and meta information.

CRITICAL: You must return ONLY a valid JSON object with exactly these three fields:
- meta_title: SEO title (string)
- meta_description: Meta description (string)
- content: Enhanced HTML content (string)

Example of EXACT format required:
{
  "meta_title": "Example Title | Brand",
  "meta_description": "Example description text here",
  "content": "<div>Example HTML content</div>"
}

Key Requirements:
1. Meta Information:
   - Meta Title: Include primary keyword and value proposition
   - Meta Description: Compelling summary with call-to-action

2. Content Optimization:
   - Maintain all HTML formatting
   - Preserve existing structure
   - Ensure content flows naturally

Original Content:
${v2Content}

IMPORTANT: 
- Return ONLY the JSON object
- NO markdown formatting
- NO code blocks
- NO additional text
- Must be valid JSON`;
  }

  stripHtmlTags(html) {
    return html.replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }
}

module.exports = new ContentService();