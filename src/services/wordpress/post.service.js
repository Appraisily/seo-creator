const client = require('./client');
const imageService = require('./image.service');
const contentStorage = require('../../utils/storage');

class WordPressPostService {
  async createPost(postData) {
    try {
      console.log('[WORDPRESS] Creating new post:', postData.title);

      // Store pre-creation state
      await this.storePostState('pre_creation', postData);

      // Handle featured image
      let featuredImageId = null;
      if (postData.images?.length > 0) {
        featuredImageId = await imageService.uploadFeaturedImage(postData.images[0].url);
      }

      // Process content images
      const processedHtml = await imageService.processContentImages(
        postData.content.html,
        postData.images
      );

      // Prepare post data
      const wpPostData = {
        title: postData.title,
        slug: postData.slug,
        content: processedHtml,
        status: 'draft',
        featured_media: featuredImageId,
        meta: {
          _yoast_wpseo_title: postData.meta.title,
          _yoast_wpseo_metadesc: postData.meta.description,
          _yoast_wpseo_focuskw: postData.meta.focus_keyword
        }
      };

      // Create post
      console.log('[WORDPRESS] Sending post creation request');
      const response = await client.request('post', '/posts', wpPostData);

      // Store and return result
      const result = await this.storePostCreationResult(response, postData);
      return result;
    } catch (error) {
      await this.logPostError('creation', error, postData);
      throw error;
    }
  }

  async getPost(postId) {
    try {
      console.log(`[WORDPRESS] Fetching post ${postId}`);
      const post = await client.request('get', `/posts/${postId}`);

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

      await this.storePostState('fetch', content, postId);
      return content;
    } catch (error) {
      await this.logPostError('fetch', error, { postId });
      throw error;
    }
  }

  async updatePost(postId, data) {
    try {
      console.log(`[WORDPRESS] Updating post ${postId}`);

      // Store pre-update state
      const preUpdateContent = await this.getPost(postId);
      await this.storePostState('pre_update', preUpdateContent, postId);

      // Prepare update data
      const updateData = {
        content: data.content,
        meta: {
          _yoast_wpseo_title: data.meta_title || '',
          _yoast_wpseo_metadesc: data.meta_description || ''
        }
      };

      // Perform update
      const response = await client.request('post', `/posts/${postId}`, updateData);

      // Store post-update state
      const postUpdateContent = {
        ...response,
        meta: updateData.meta
      };

      await this.storePostState('post_update', postUpdateContent, postId);

      return {
        success: true,
        postId: response.id,
        modified: response.modified
      };
    } catch (error) {
      await this.logPostError('update', error, { postId, data });
      throw error;
    }
  }

  async storePostState(type, content, postId = null) {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    const path = postId
      ? `seo/posts/${postId}/${type}_${timestamp}.json`
      : `seo/posts/${date}/${type}.json`;

    await contentStorage.storeContent(path, content, {
      type: `${type}_content`,
      wordpress_id: postId,
      timestamp
    });
  }

  async storePostCreationResult(response, originalData) {
    const result = {
      success: true,
      wordpress_id: response.id,
      wordpress_url: response.link,
      created_at: new Date().toISOString(),
      original_data: originalData,
      wordpress_response: response
    };

    await this.storePostState('creation_result', result, response.id);
    return result;
  }

  async logPostError(operation, error, context) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      context,
      error: {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      }
    };

    await contentStorage.storeContent(
      `seo/logs/wordpress/${new Date().toISOString().split('T')[0]}/errors.json`,
      errorLog,
      {
        type: `post_${operation}_error`,
        timestamp: new Date().toISOString()
      }
    );
  }
}

module.exports = new WordPressPostService();