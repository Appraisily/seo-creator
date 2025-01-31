const axios = require('axios');
const { getSecret } = require('../utils/secrets');
const { secretNames } = require('../config');
const contentStorage = require('../utils/storage');

class WordPressService {
  constructor() {
    this.isInitialized = false;
    this.client = null;
  }

  async initialize() {
    try {
      // Get WordPress credentials from Secret Manager
      const [baseURL, username, password] = await Promise.all([
        getSecret(secretNames.wpApiUrl),
        getSecret(secretNames.wpUsername),
        getSecret(secretNames.wpPassword)
      ]);

      // Create axios instance with auth and proper base URL
      this.client = axios.create({
        baseURL,
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      this.isInitialized = true;
      await contentStorage.initialize();
      console.log('[WORDPRESS] Successfully initialized');
    } catch (error) {
      console.error('[WORDPRESS] Initialization failed:', error);
      throw error;
    }
  }

  async getPost(postId) {
    if (!this.isInitialized) {
      throw new Error('WordPress service not initialized');
    }

    try {
      console.log(`[WORDPRESS] Fetching post ${postId}`);
      const { data: post } = await this.client.get(`/posts/${postId}`);

      const content = {
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        modified: post.modified,
        status: post.status,
        meta: {
          _yoast_wpseo_title: post.meta?._yoast_wpseo_title || '',
          _yoast_wpseo_metadesc: post.meta?._yoast_wpseo_metadesc || ''
        }
      };

      // Store the original content
      await contentStorage.storeContent(postId, content, 'original');
      
      return content;
    } catch (error) {
      console.error(`[WORDPRESS] Failed to fetch post ${postId}:`, error);
      throw new Error(`Failed to fetch post ${postId}`);
    }
  }

  async updatePost(postId, data) {
    if (!this.isInitialized) {
      throw new Error('WordPress service not initialized');
    }

    try {
      console.log(`[WORDPRESS] Updating post ${postId}`);
      console.log('[WORDPRESS] Update data:', {
        contentLength: data.content?.length,
        hasMetaTitle: !!data.meta_title,
        hasMetaDesc: !!data.meta_description
      });

      // Prepare the update payload
      const updateData = {
        content: data.content,
        meta: {
          _yoast_wpseo_title: data.meta_title || '',
          _yoast_wpseo_metadesc: data.meta_description || ''
        }
      };

      // Store pre-update state
      const preUpdateContent = await this.getPost(postId);
      await contentStorage.storeContent(postId, preUpdateContent, 'pre-update');

      // Perform the update
      const { data: response } = await this.client.post(`/posts/${postId}`, updateData);

      // Store post-update state
      const postUpdateContent = {
        ...response,
        meta: {
          _yoast_wpseo_title: data.meta_title || '',
          _yoast_wpseo_metadesc: data.meta_description || ''
        }
      };
      await contentStorage.storeContent(postId, postUpdateContent, 'post-update');

      console.log(`[WORDPRESS] Successfully updated post ${postId}`);
      return {
        success: true,
        postId: response.id,
        modified: response.modified
      };
    } catch (error) {
      console.error(`[WORDPRESS] Failed to update post ${postId}:`, error);
      throw new Error(`Failed to update post ${postId}: ${error.message}`);
    }
  }
}

module.exports = new WordPressService();