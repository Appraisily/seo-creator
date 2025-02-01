const axios = require('axios');
const { getSecret } = require('../../utils/secrets');
const { secretNames } = require('../../config');

class WordPressClient {
  constructor() {
    this.isInitialized = false;
    this.client = null;
  }

  async initialize() {
    try {
      const [baseURL, username, password] = await Promise.all([
        getSecret(secretNames.wpApiUrl),
        getSecret(secretNames.wpUsername),
        getSecret(secretNames.wpPassword)
      ]);

      this.client = axios.create({
        baseURL,
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      this.isInitialized = true;
      console.log('[WORDPRESS] Client initialized successfully');
    } catch (error) {
      console.error('[WORDPRESS] Client initialization failed:', error);
      throw error;
    }
  }

  async request(method, endpoint, data = null, config = {}) {
    if (!this.isInitialized) {
      throw new Error('WordPress client not initialized');
    }

    try {
      const response = await this.client[method](endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`[WORDPRESS] API request failed: ${method.toUpperCase()} ${endpoint}`, error);
      throw error;
    }
  }
}

module.exports = new WordPressClient();