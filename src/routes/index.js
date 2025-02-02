const express = require('express');
const contentController = require('../controllers/content.controller');
const wordpressService = require('../services/wordpress');

const router = express.Router();

// Content generation endpoints
router.post('/process', contentController.processContent.bind(contentController));
router.post('/generate-content', contentController.generateContent.bind(contentController));

// Complete SEO post creation endpoint
router.post('/create-seo-post', contentController.createSeoPost.bind(contentController));

// Recovery endpoint for failed WordPress post creation
router.post('/recovery/:date/:keyword', contentController.recoverPostCreation.bind(contentController));

// WordPress test endpoint
router.post('/test/wordpress', async (req, res) => {
  try {
    // Hardcoded test content for Elgin watch post
    const testContent = {
      success: true,
      title: "Discover Elgin Antique Pocket Watch Value Today",
      slug: "discover-elgin-antique-pocket-watch-value-today",
      meta: {
        title: "Discover Elgin Antique Pocket Watch Value Today - Comprehensive Guide",
        description: "Uncover the Elgin Antique Pocket Watch Value with our comprehensive guide. Learn about history, factors affecting value, and where to buy or sell. Act now!",
        focus_keyword: "Elgin Antique Pocket Watch Value"
      },
      content: {
        html: "<article>\n  <header>\n    <h1>Discover Elgin Antique Pocket Watch Value Today</h1>\n  </header>\n  <section>\n    <p>Elgin Antique Pocket Watch Value is a key term for collectors and enthusiasts. Elgin antique pocket watches are cherished collectibles that blend timeless craftsmanship with historical significance. Understanding the <strong>Elgin Antique Pocket Watch Value</strong> is essential for collectors, enthusiasts, and investors alike.</p>\n  </section>\n</article>"
      },
      images: [
        {
          url: "https://example.com/generated/featured-elgin-pocket-watch.jpg",
          alt: "Featured Elgin Antique Pocket Watch showcasing timeless design and intricate craftsmanship"
        }
      ]
    };

    console.log('[TEST] Starting WordPress post creation test with Elgin watch content');
    const result = await wordpressService.createPost(testContent);
    
    res.json({
      success: true,
      wordpress_id: result.wordpress_id,
      wordpress_url: result.wordpress_url,
      created_at: result.created_at
    });
  } catch (error) {
    console.error('[TEST] WordPress test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    });
  }
});

// Debug endpoints
router.post('/debug/generate-image', async (req, res) => {
  try {
    const openaiService = require('../services/openai.service');
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