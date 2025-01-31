const express = require('express');
const contentController = require('../controllers/content.controller');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');

const router = express.Router();

// Content generation endpoints
router.post('/process', contentController.processContent);
router.post('/generate-content', contentController.generateContent);
router.post('/compose-html', contentController.composeHtml);

// Debug endpoints
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
    const result = await openaiService.generateImage(prompt, size);
    
    res.json({
      success: true,
      imageUrl: result.url,
      prompt,
      size: size || '1024x1024'
    });
  } catch (error) {
    console.error('[DEBUG] Image generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data?.error
    });
  }
});

module.exports = router;