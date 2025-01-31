const express = require('express');
const routes = require('./routes');
const sheetsService = require('./services/sheets.service');
const wordpressService = require('./services/wordpress.service');
const openaiService = require('./services/openai.service');
const contentStorage = require('./utils/storage');

const app = express();

app.use(express.json());
app.use('/api', routes);

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const status = {
    status: 'ok',
    services: {
      sheets: sheetsService.isConnected ? 'connected' : 'disconnected',
      wordpress: wordpressService.isInitialized ? 'connected' : 'disconnected',
      openai: openaiService.isInitialized ? 'connected' : 'disconnected',
      storage: contentStorage.bucket ? 'connected' : 'disconnected'
    }
  };

  // If any critical service is down, return 503
  const criticalServicesDown = !sheetsService.isConnected || 
                             !wordpressService.isInitialized || 
                             !openaiService.isInitialized;

  res.status(criticalServicesDown ? 503 : 200).json(status);
});

module.exports = app;