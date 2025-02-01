const client = require('./client');
const postService = require('./post.service');
const imageService = require('./image.service');

class WordPressService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await client.initialize();
      this.isInitialized = true;
      console.log('[WORDPRESS] Service initialized successfully');
    } catch (error) {
      console.error('[WORDPRESS] Service initialization failed:', error);
      throw error;
    }
  }

  // Post operations
  createPost(postData) {
    return postService.createPost(postData);
  }

  getPost(postId) {
    return postService.getPost(postId);
  }

  updatePost(postId, data) {
    return postService.updatePost(postId, data);
  }
}

module.exports = new WordPressService();