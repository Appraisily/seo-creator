const openaiService = require('./openai.service');

class ComposerService {
  async composeHtml(contentJson) {
    try {
      console.log('[COMPOSER] Starting HTML composition');
      
      // Function definition that will be available to the model
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

      const systemPrompt = `You are an expert HTML composer specializing in SEO-optimized content. Your task is to create a complete HTML post from the provided JSON content.

Key Requirements:
1. Create semantic, accessible HTML
2. Include schema.org markup where appropriate
3. Optimize for SEO
4. Generate appropriate images using the generateImage function
5. Create an engaging, professional layout

You have access to the generateImage function to create custom images. Use it strategically for:
- Featured images
- Section illustrations
- Infographics
- Gallery images

Return a JSON object with:
- html: The complete HTML content
- meta: Meta information (title, description)
- images: List of generated images with their purposes
- schema: Schema.org JSON-LD markup`;

      const userPrompt = `Create a complete HTML post from this content:
${JSON.stringify(contentJson, null, 2)}

IMPORTANT:
- Return valid JSON only
- Include all required sections
- Use semantic HTML5
- Generate appropriate images
- Include schema.org markup`;

      console.log('[COMPOSER] Sending request to OpenAI');
      const completion = await openaiService.openai.createChatCompletion({
        model: 'o1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: functionDefinitions,
        function_call: 'auto'
      });

      let composedContent = completion.data.choices[0].message;
      let finalResult = {};

      // Handle function calls and build the final result
      while (composedContent.function_call) {
        const functionCall = composedContent.function_call;
        
        if (functionCall.name === 'generateImage') {
          const args = JSON.parse(functionCall.arguments);
          console.log('[COMPOSER] Generating image:', args.prompt);
          
          const imageResult = await openaiService.generateImage(args.prompt, args.size);
          
          // Create a new message with the function result
          const functionResponse = {
            role: 'function',
            name: 'generateImage',
            content: JSON.stringify({ url: imageResult.url })
          };

          // Continue the conversation with the function result
          const nextCompletion = await openaiService.openai.createChatCompletion({
            model: 'o1-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
              composedContent,
              functionResponse
            ],
            functions: functionDefinitions,
            function_call: 'auto'
          });

          composedContent = nextCompletion.data.choices[0].message;
        }
      }

      try {
        finalResult = JSON.parse(composedContent.content);
      } catch (error) {
        console.error('[COMPOSER] Error parsing final content:', error);
        throw new Error('Invalid JSON response from composer');
      }

      console.log('[COMPOSER] Successfully composed HTML content');
      return {
        success: true,
        ...finalResult
      };
    } catch (error) {
      console.error('[COMPOSER] Error composing HTML:', error);
      throw error;
    }
  }
}

module.exports = new ComposerService();