const axios = require('axios');
const client = require('./client');
const contentStorage = require('../../utils/storage');

class WordPressImageService {
  async uploadFeaturedImage(imageUrl) {
    try {
      console.log('[WORDPRESS] Uploading featured image:', imageUrl);
      
      // Download image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageResponse.data, 'binary');

      // Upload to WordPress
      const formData = new FormData();
      formData.append('file', new Blob([buffer]), 'featured-image.jpg');
      
      const response = await client.request('post', '/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('[WORDPRESS] Featured image uploaded, ID:', response.id);
      return response.id;
    } catch (error) {
      console.error('[WORDPRESS] Error uploading featured image:', error);
      await this.logImageError(imageUrl, error);
      return null;
    }
  }

  async processContentImages(content, images) {
    let processedHtml = content;
    
    if (images) {
      for (const image of images) {
        processedHtml = processedHtml.replace(
          new RegExp(image.url, 'g'),
          image.wordpress_url || image.url
        );
      }
    }

    return processedHtml;
  }

  async logImageError(imageUrl, error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      image_url: imageUrl,
      error: {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      }
    };

    await contentStorage.storeContent(
      `seo/logs/wordpress/images/${new Date().toISOString().split('T')[0]}/errors.json`,
      errorLog,
      {
        type: 'image_upload_error',
        timestamp: new Date().toISOString()
      }
    );
  }
}

module.exports = new WordPressImageService();