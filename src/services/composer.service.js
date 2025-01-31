const openaiService = require('./openai.service');

class ComposerService {
  async composeHtml(contentJson) {
    try {
      console.log('[COMPOSER] Starting HTML composition');
      console.log('[COMPOSER] Content JSON size:', JSON.stringify(contentJson).length);
      
      // Function definition for image generation
      const functionDefinitions = [
        {
          name: 'generateImage',
          description: 'Generate an image using DALL-E 3',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Detailed description of the image to generate'
              },
              size: {
                type: 'string',
                enum: ['1024x1024', '1792x1024', '1024x1792'],
                description: 'Size of the image to generate',
                default: '1024x1024'
              }
            },
            required: ['prompt']
          }
        }
      ];

      // Initialize conversation with the agent
      const conversation = [
        {
          role: 'assistant',
          content: `You are an expert WordPress content composer specializing in SEO-optimized articles. Your task is to transform the provided content into a structured WordPress post format.

CRITICAL: You MUST return a valid JSON object with EXACTLY these fields:

{
  "title": "SEO-optimized post title",
  "slug": "url-friendly-slug",
  "meta": {
    "title": "SEO meta title",
    "description": "Compelling meta description",
    "focus_keyword": "primary keyword"
  },
  "content": {
    "html": "Full HTML content with semantic markup"
  },
  "images": [
    {
      "url": "image URL",
      "alt": "descriptive alt text"
    }
  ]
}

Key Requirements:
1. Follow the JSON structure EXACTLY - include ONLY the specified fields
2. Create semantic, accessible HTML content
3. Generate appropriate images using the generateImage function
4. Optimize all elements for SEO

Image Generation Guidelines:
- Generate a featured image that captures the main topic
- Create relevant section illustrations
- Ensure all images have descriptive alt text

SEO Requirements:
- Include focus keyword in title, meta title, and first paragraph
- Create compelling meta descriptions with call-to-action
- Use semantic HTML5 elements (article, section, etc.)
- Structure content with proper heading hierarchy`
        },
        {
          role: 'user',
          content: `Transform this content into a WordPress post format:
${JSON.stringify(contentJson, null, 2)}

IMPORTANT:
- Return ONLY valid JSON with EXACTLY the specified fields
- Generate appropriate images
- Optimize for SEO
- Use semantic HTML5 markup`
        }
      ];

      console.log('[COMPOSER] Starting conversation with AI agent');
      let currentMessage = await openaiService.openai.createChatCompletion({
        model: 'o1-mini',
        messages: conversation,
        functions: functionDefinitions,
        function_call: 'auto'
      });

      let response = currentMessage.data.choices[0].message;
      let generatedImages = [];

      // Handle function calls in a loop until the agent completes its task
      while (response.function_call) {
        const functionCall = response.function_call;
        console.log('[COMPOSER] Agent requested function:', functionCall.name);

        if (functionCall.name === 'generateImage') {
          const args = JSON.parse(functionCall.arguments);
          console.log('[COMPOSER] Generating image:', args.prompt);

          // Generate the image
          const imageResult = await openaiService.generateImage(args.prompt, args.size);
          console.log('[COMPOSER] Image generated:', imageResult.url);

          // Store generated image info
          generatedImages.push({
            url: imageResult.url,
            alt: args.prompt
          });

          // Add the function result to the conversation
          conversation.push(response);
          conversation.push({
            role: 'function',
            name: 'generateImage',
            content: JSON.stringify({ url: imageResult.url })
          });

          // Continue the conversation
          currentMessage = await openaiService.openai.createChatCompletion({
            model: 'o1-mini',
            messages: conversation,
            functions: functionDefinitions,
            function_call: 'auto'
          });

          response = currentMessage.data.choices[0].message;
        }
      }

      // Parse the final response
      console.log('[COMPOSER] Agent completed task, parsing final response');
      let finalResult;
      try {
        finalResult = JSON.parse(response.content);
        console.log('[COMPOSER] Successfully parsed response');
      } catch (error) {
        console.error('[COMPOSER] Error parsing final response:', error);
        console.error('[COMPOSER] Raw response:', response.content);
        throw new Error('Invalid JSON response from agent');
      }

      // Add generated images to the result
      finalResult.images = [...(finalResult.images || []), ...generatedImages];

      return {
        success: true,
        ...finalResult
      };

    } catch (error) {
      console.error('[COMPOSER] Error in composition process:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new ComposerService();