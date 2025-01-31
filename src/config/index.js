const port = process.env.PORT || 8080;

module.exports = {
  port,
  secretNames: {
    sheetsId: 'SHEETS_ID_SEO',
    openAiKey: 'OPEN_AI_API_SEO',
    wpApiUrl: 'WORDPRESS_API_URL',
    wpUsername: 'wp_username',
    wpPassword: 'wp_app_password',
    serviceAccountJson: 'service-account-json'
  }
};