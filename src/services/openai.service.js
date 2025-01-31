const { Configuration, OpenAIApi } = require('openai');
const { getSecret } = require('../utils/secrets');
const { secretNames } = require('../config');

class OpenAIService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const apiKey = await getSecret(secretNames.openAiKey);
      const configuration = new Configuration({ apiKey });
      this.openai = new OpenAIApi(configuration);
      this.isInitialized = true;
      console.log('[OPENAI] Successfully initialized');
    } catch (error) {
      console.error('[OPENAI] Initialization failed:', error);
      throw error;
    }
  }

  async generateImage(prompt, size = "1024x1024") {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      console.log('[OPENAI] Generating image with prompt:', prompt);
      
      const response = await this.openai.createImage({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "url"
      });

      if (!response.data || !response.data.data || !response.data.data[0] || !response.data.data[0].url) {
        throw new Error('Invalid response from DALL-E 3');
      }

      const imageUrl = response.data.data[0].url;
      console.log('[OPENAI] Successfully generated image:', imageUrl);
      
      return {
        success: true,
        url: imageUrl
      };
    } catch (error) {
      console.error('[OPENAI] Error generating image:', error);
      
      // Log detailed API error if available
      if (error.response) {
        console.error('[OPENAI] API error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async enhanceContent(prompt, keyword, version = 'v1') {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      console.log(`[OPENAI] Sending request to enhance content (${version}) with keyword:`, keyword);
      
      // Use o1-mini for v3, gpt-4o for others
      const model = version === 'v3' ? 'o1-mini' : 'gpt-4o';
      
      // Use 'assistant' role for o1-mini, 'system' for others
      const instructionRole = model === 'o1-mini' ? 'assistant' : 'system';
      
      const completion = await this.openai.createChatCompletion({
        model,
        messages: [
          {
            role: instructionRole,
            content: "You are an expert content enhancer specializing in antiques and art valuation. Your task is to enhance WordPress content while maintaining HTML structure and adding compelling CTAs. Return only the enhanced content with HTML formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const enhancedContent = completion.data.choices[0].message.content;
      
      // Check for truncation
      if (completion.data.choices[0].finish_reason === 'length') {
        console.error(`[OPENAI] Response was truncated (${version})`);
        throw new Error(`Response truncated - content too long (${version})`);
      }

      console.log(`[OPENAI] Successfully received enhanced content (${version})`);
      
      return enhancedContent;
    } catch (error) {
      // Log the full error response from OpenAI
      console.error(`[OPENAI] Full error response:`, error.response?.data);
      console.error('[OPENAI] Error details:', error.response?.data?.error);
      
      // Check for specific OpenAI errors
      if (error.response?.data?.error?.code === 'context_length_exceeded') {
        console.error(`[OPENAI] Context length exceeded (${version}):`, error.response.data.error);
        throw new Error(`Content too long for processing (${version})`);
      }
      
      console.error(`[OPENAI] Error enhancing content (${version}):`, error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();