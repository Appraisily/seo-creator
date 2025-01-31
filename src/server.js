const app = require('./app');
const { port } = require('./config');
const sheetsService = require('./services/sheets.service');
const wordpressService = require('./services/wordpress.service');
const openaiService = require('./services/openai.service');
const contentStorage = require('./utils/storage');

async function initializeService(service, name) {
  try {
    await service.initialize();
    console.log(`[SERVER] ${name} service initialized successfully`);
    return true;
  } catch (error) {
    console.error(`[SERVER] ${name} service failed to initialize:`, error);
    return false;
  }
}

async function initialize() {
  console.log('[SERVER] Starting initialization...');
  
  // Initialize services in parallel for better performance
  const [sheetsInitialized, wordpressInitialized, openaiInitialized, storageInitialized] = 
    await Promise.all([
      initializeService(sheetsService, 'Google Sheets'),
      initializeService(wordpressService, 'WordPress'),
      initializeService(openaiService, 'OpenAI'),
      initializeService(contentStorage, 'Storage')
    ]);
  
  // Start the server regardless of service initialization status
  app.listen(port, () => {
    console.log(`[SERVER] Running on port ${port}`);
    console.log('[SERVER] Service Status:');
    console.log(`[SERVER] Sheets:    ${sheetsInitialized ? 'Connected' : 'Failed'}`);
    console.log(`[SERVER] WordPress: ${wordpressInitialized ? 'Connected' : 'Failed'}`);
    console.log(`[SERVER] OpenAI:    ${openaiInitialized ? 'Connected' : 'Failed'}`);
    console.log(`[SERVER] Storage:   ${storageInitialized ? 'Connected' : 'Failed'}`);
    
    if (!sheetsInitialized || !wordpressInitialized || !openaiInitialized || !storageInitialized) {
      console.warn('[SERVER] Warning: Some services failed to initialize');
    }
  });

  // Return initialization status
  return {
    sheetsInitialized,
    wordpressInitialized,
    openaiInitialized,
    storageInitialized
  };
}

// Handle initialization errors gracefully
initialize().catch(error => {
  console.error('[SERVER] Critical initialization error:', error);
  process.exit(1);
});