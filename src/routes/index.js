const express = require('express');
const contentController = require('../controllers/content.controller');
const openaiService = require('../services/openai.service');
const composerService = require('../services/composer.service');
const wordpressService = require('../services/wordpress');

const router = express.Router();

// Content generation endpoints
router.post('/process', contentController.processContent);
router.post('/generate-content', contentController.generateContent);
router.post('/compose-html', contentController.composeHtml);

// Complete SEO post creation endpoint
router.post('/create-seo-post', contentController.createSeoPost.bind(contentController));

// Recovery endpoint for failed WordPress post creation
router.post('/recover/:date/:keyword', contentController.recoverPostCreation.bind(contentController));

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
        html: "<article>\n  <header>\n    <h1>Discover Elgin Antique Pocket Watch Value Today</h1>\n  </header>\n  <section>\n    <p>Elgin Antique Pocket Watch Value is a key term for collectors and enthusiasts. Elgin antique pocket watches are cherished collectibles that blend timeless craftsmanship with historical significance. Understanding the <strong>Elgin Antique Pocket Watch Value</strong> is essential for collectors, enthusiasts, and investors alike.</p>\n  </section>\n  <section>\n    <h2>History of Elgin Pocket Watches</h2>\n    <p>Elgin was established as a prominent watchmaker in the late 19th century, becoming synonymous with quality and innovation. Founded in Elgin, Illinois, the company quickly gained a reputation for precision and durable craftsmanship. Key milestones include the introduction of mass production techniques in the early 1900s, which made Elgin pocket watches widely accessible. Over the decades, Elgin evolved its designs, incorporating intricate engravings and advanced mechanisms, solidifying its place in horological history.</p>\n  </section>\n  <section>\n    <h2>Factors Affecting the Value of Elgin Antique Pocket Watches</h2>\n    <p>Several factors influence the Elgin Antique Pocket Watch Value, including:</p>\n    <ul>\n      <li><strong>Age</strong>: Older models often command higher prices due to rarity.</li>\n      <li><strong>Condition</strong>: Watches in excellent condition with minimal wear are more valuable.</li>\n      <li><strong>Rarity</strong>: Limited edition or uncommon models can significantly increase value.</li>\n      <li><strong>Model Type</strong>: Certain styles, such as those with unique engravings or complications, are prized.</li>\n      <li><strong>Provenance</strong>: A well-documented history or association with notable individuals can enhance value.</li>\n    </ul>\n  </section>\n  <section>\n    <h2>Common Models and Their Value Range</h2>\n    <ul>\n      <li><strong>Elgin National</strong>: Valued between $200 to $500, known for simplicity and reliability.</li>\n      <li><strong>Elgin Three-Finger</strong>: Ranges from $500 to $1,200, featuring elaborate engravings and decorative elements.</li>\n      <li><strong>Elgin Key Wind</strong>: Often priced between $300 to $800, recognized for its unique winding mechanism.</li>\n      <li><strong>Elgin Silver and Gold Models</strong>: These can range from $1,000 to $5,000 depending on material and craftsmanship.</li>\n    </ul>\n  </section>\n  <section>\n    <h2>How to Authenticate an Elgin Antique Pocket Watch</h2>\n    <ol>\n      <li><strong>Identify Marks</strong>: Look for Elgin's hallmark, serial numbers, and other identifying engravings on the watch.</li>\n      <li><strong>Examine Craftsmanship</strong>: High-quality materials and intricate detailing are indicators of authenticity.</li>\n      <li><strong>Check Movement</strong>: Genuine Elgin watches have specific movement types; consulting a reference guide can help.</li>\n      <li><strong>Consult Experts</strong>: Seek appraisals from certified horologists or reputable antique watch appraisers to verify authenticity.</li>\n    </ol>\n  </section>\n  <section>\n    <h2>Caring for Your Elgin Antique Pocket Watch</h2>\n    <ul>\n      <li><strong>Storage</strong>: Keep the watch in a protective case away from extreme temperatures and moisture.</li>\n      <li><strong>Cleaning</strong>: Gently clean the exterior with a soft cloth; avoid harsh chemicals.</li>\n      <li><strong>Servicing</strong>: Regularly take the watch to a professional for servicing to ensure the movement remains in good working order.</li>\n      <li><strong>Handling</strong>: Handle the watch carefully to prevent scratches and mechanical damage.</li>\n    </ul>\n  </section>\n  <section>\n    <h2>Where to Buy or Sell Elgin Antique Pocket Watches</h2>\n    <ul>\n      <li><strong>Auctions</strong>: Houses like <a href=\"https://www.sothebys.com/en/buy/collectible-watches\" target=\"_blank\">Sotheby's Collectible Watches</a> and <a href=\"https://www.christies.com/en/auction/cw/watches\" target=\"_blank\">Christie's Watch Auctions</a> often feature antique watches.</li>\n      <li><strong>Dealers</strong>: Specialized antique watch dealers provide authenticated selections.</li>\n      <li><strong>Online Marketplaces</strong>: Platforms such as eBay, Etsy, and Chrono24 offer a wide range of options.</li>\n      <li><strong>Antique Shows</strong>: Local and national antique shows can be excellent venues for finding and selling watches.</li>\n    </ul>\n  </section>\n  <section>\n    <h2>Expert Tips for Maximizing Your Pocket Watch's Value</h2>\n    <ul>\n      <li><strong>Restoration</strong>: Undertake minimal restoration to maintain originality; excessive alterations can decrease value.</li>\n      <li><strong>Documentation</strong>: Keep all original papers, receipts, and provenance documentation.</li>\n      <li><strong>Presentation</strong>: Display the watch in a quality case to protect and showcase its features.</li>\n      <li><strong>Market Trends</strong>: Stay informed about market trends to time your sale for optimal value.</li>\n    </ul>\n  </section>\n  <section>\n    <h2>Conclusion</h2>\n    <p>Understanding the Elgin Antique Pocket Watch Value involves appreciating its rich history, recognizing the factors that influence its worth, and knowing how to care for and authenticate these timeless pieces. Whether you're a collector, enthusiast, or investor, being informed enhances your ability to make smart decisions. For personalized advice or appraisals, consider reaching out to experts in antique watches.</p>\n  </section>\n  <section>\n    <h2>Further Resources</h2>\n    <p>For additional insights, check out our <a href=\"/guide-to-collecting-antique-watches\">Guide to Collecting Antique Watches</a> and our <a href=\"/elgin-watch-care-tips\">Elgin Watch Care Tips</a> for more detailed information.</p>\n  </section>\n  <section>\n    <h2>Call to Action</h2>\n    <p>Ready to evaluate your Elgin antique pocket watch? Contact our certified appraisers today or visit our store to explore our extensive collection. Subscribe to our newsletter for more expert insights and updates on antique timepieces.</p>\n  </section>\n  <script type=\"application/ld+json\">\n  {\n    \"@context\": \"https://schema.org\",\n    \"@type\": \"Article\",\n    \"headline\": \"Discover Elgin Antique Pocket Watch Value Today\",\n    \"description\": \"Uncover the Elgin Antique Pocket Watch Value with our comprehensive guide. Learn about history, factors affecting value, and where to buy or sell.\",\n    \"image\": [\n      \"https://example.com/images/elgin-pocket-watch-1.jpg\",\n      \"https://example.com/images/elgin-pocket-watch-2.jpg\",\n      \"https://example.com/images/elgin-pocket-watch-3.jpg\"\n    ],\n    \"author\": {\n      \"@type\": \"Person\",\n      \"name\": \"Your Name\"\n    },\n    \"publisher\": {\n      \"@type\": \"Organization\",\n      \"name\": \"Your Website Name\",\n      \"logo\": {\n        \"@type\": \"ImageObject\",\n        \"url\": \"https://example.com/logo.png\"\n      }\n    },\n    \"datePublished\": \"2024-04-27\",\n    \"mainEntityOfPage\": {\n      \"@type\": \"WebPage\",\n      \"@id\": \"https://example.com/elgin-antique-pocket-watch-value\"\n    }\n  }\n  </script>\n</article>"
      },
      images: [
        {
          url: "https://example.com/generated/featured-elgin-pocket-watch.jpg",
          alt: "Featured Elgin Antique Pocket Watch showcasing timeless design and intricate craftsmanship"
        },
        {
          url: "https://example.com/images/elgin-pocket-watch-1.jpg",
          alt: "Elgin Antique Pocket Watch Model 1 showcasing intricate engravings"
        },
        {
          url: "https://example.com/images/elgin-pocket-watch-2.jpg",
          alt: "Elgin Three-Finger Pocket Watch displaying decorative elements"
        },
        {
          url: "https://example.com/images/elgin-pocket-watch-3.jpg",
          alt: "Close-up of Elgin National Pocket Watch mechanism"
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