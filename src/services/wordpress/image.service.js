const axios = require('axios');
const client = require('./client');
const contentStorage = require('../../utils/storage');

class WordPressImageService {
  async uploadFeaturedImage(imageUrl) {
    try {
      console.log('[WORDPRESS] Uploading featured image:', imageUrl);
      
      // Download image with proper error handling
      let imageResponse;
      try {
        imageResponse = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          timeout: 10000 // 10 second timeout
        });
      } catch (downloadError) {
        console.error('[WORDPRESS] Error downloading image:', downloadError);
        throw new Error(`Failed to download image: ${downloadError.message}`);
      }

      const buffer = Buffer.from(imageResponse.data, 'binary');
      const filename = `image-${Date.now()}.jpg`;
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', new Blob([buffer]), filename);

      // Upload to WordPress using the correct endpoint
      const response = await client.request('post', '/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response || !response.id || !response.source_url) {
        throw new Error('Invalid response from WordPress media upload');
      }

      console.log('[WORDPRESS] Image uploaded successfully:', {
        id: response.id,
        url: response.source_url
      });

      return {
        id: response.id,
        url: response.source_url,
        source_url: response.source_url
      };

    } catch (error) {
      console.error('[WORDPRESS] Error uploading featured image:', error);
      await this.logImageError(imageUrl, error);
      throw error;
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