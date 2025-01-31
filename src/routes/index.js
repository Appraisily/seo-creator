const express = require('express');
const contentController = require('../controllers/content.controller');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');

const router = express.Router();

router.post('/process', contentController.processContent);

// Debug endpoint for testing HTML composition
router.post('/debug/compose-html', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content JSON is required' 
      });
    }

    console.log('[DEBUG] Starting HTML composition with content');
    const result = await composerService.composeHtml(content);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[DEBUG] HTML composition error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.response?.data?.error
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: {
        message: error.response?.data?.error?.message,
        type: error.response?.data?.error?.type,
        code: error.response?.data?.error?.code
      }
    });
  }
});

// Debug endpoint for testing image generation
router.post('/debug/generate-image', async (req, res) => {
  try {
    const { prompt, size } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

    console.log('[DEBUG] Starting image generation with prompt:', prompt);
    console.log('[DEBUG] OpenAI service initialized:', openaiService.isInitialized);

    const result = await openaiService.generateImage(prompt, size);
    console.log('[DEBUG] Image generation successful');
    
    res.json({
      success: true,
      imageUrl: result.url,
      prompt,
      size: size || '1024x1024'
    });
  } catch (error) {
    console.error('[DEBUG] Image generation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.response?.data?.error
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: {
        message: error.response?.data?.error?.message,
        type: error.response?.data?.error?.type,
        param: error.response?.data?.error?.param,
        code: error.response?.data?.error?.code
      }
    });
  }
});

// Debug endpoint for testing v3 enhancement
router.post('/debug/v3-enhance', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('[DEBUG] Starting v3 enhancement with content length:', content.length);
    console.log('[DEBUG] OpenAI service initialized:', openaiService.isInitialized);

    // Create a custom completion for debugging
    const completion = await openaiService.openai.createChatCompletion({
      model: 'o1-mini',
      messages: [
        {
          role: "assistant",
          content: "You are an expert content enhancer specializing in antiques and art valuation. Your task is to enhance WordPress content while maintaining HTML structure and adding compelling CTAs. Return only the enhanced content with HTML formatting."
        },
        {
          role: "user",
          content: `You are a content editor. Your task is to enhance the following content with SEO optimizations and meta information.

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
${content}

IMPORTANT: 
- Return ONLY the JSON object
- NO markdown formatting
- NO code blocks
- NO additional text
- Must be valid JSON`
        }
      ]
    });

    const enhancedContent = completion.data.choices[0].message.content;
    console.log('[DEBUG] Successfully received enhanced content');
    res.json({ success: true, result: enhancedContent });
  } catch (error) {
    console.error('[DEBUG] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.response?.data?.error
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: {
        message: error.response?.data?.error?.message,
        type: error.response?.data?.error?.type,
        param: error.response?.data?.error?.param,
        code: error.response?.data?.error?.code
      }
    });
  }
});

module.exports = router;