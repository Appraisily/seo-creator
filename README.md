# SEO Content Enhancement Service

## Overview
This service automatically enhances WordPress content for SEO using OpenAI's GPT model. It processes content from a Google Sheets document containing post IDs and keywords, fetches the corresponding WordPress posts, enhances their content using OpenAI, and updates the posts with the optimized content. The service is deployed at:

```
https://seo-856401495068.us-central1.run.app
```

## Architecture

### Services
The application is built with three core services:

1. **Google Sheets Service**
   - Connects to a Google Spreadsheet containing posts to process
   - Reads post IDs and their target keywords
   - Uses Google Cloud's application default credentials

2. **WordPress Service**
   - Interfaces with WordPress REST API
   - Handles post retrieval and updates
   - Uses basic authentication
   - Credentials stored in Google Secret Manager

3. **OpenAI Service**
   - Enhances content using GPT models
   - Optimizes content for provided keywords
   - API key stored in Google Secret Manager

### Key Components

- `src/server.js`: Application entry point with independent service initialization
- `src/app.js`: Express application setup and health check endpoint
- `src/controllers/`: Request handlers and business logic
- `src/services/`: Core service implementations
- `src/utils/`: Utility functions (e.g., secret management)
- `src/config/`: Configuration constants and environment variables

## Configuration

### Environment Variables
The following runtime environment variables must be configured in Cloud Run:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PROJECT_ID` | Google Cloud project ID | Yes | - |
| `PORT` | Server port | No | 8080 |

> **IMPORTANT**: `PROJECT_ID` must be set as a runtime environment variable in Cloud Run, not as a secret. This is required for accessing Secret Manager and other Google Cloud services.

### Required Secrets
The following secrets must be configured in Google Secret Manager within your project:

| Secret Name | Description |
|-------------|-------------|
| `WORDPRESS_API_URL` | WordPress REST API endpoint |
| `wp_username` | WordPress username |
| `wp_app_password` | WordPress application password |
| `OPEN_AI_API_SEO` | OpenAI API key |
| `SHEETS_ID_SEO` | Google Sheets document ID |

## API Endpoints

### POST /api/process
Triggers the content enhancement process:
- Reads posts from Google Sheets
- Fetches current content from WordPress
- Enhances content with OpenAI
- Updates WordPress posts
- Returns number of processed posts

### GET /health
Health check endpoint that returns:
- Service status
- Connection status for all services (Sheets, WordPress, OpenAI, Storage)

Example:
```bash
curl https://seo-856401495068.us-central1.run.app/health
```

## Error Handling
- Independent service initialization
- Detailed error logging for each service
- Graceful error handling in content processing
- Skip processing for failed individual posts

## Deployment

### Docker
The service includes a Dockerfile for containerized deployment:
```bash
docker build -t seo-enhancement-service .
docker run -p 8080:8080 seo-enhancement-service
```

### Google Cloud Run
Recommended deployment platform:
- Automatic scaling
- Managed SSL/TLS
- Built-in secret management
- Application default credentials

## Development

### Prerequisites
- Node.js 18+
- Google Cloud SDK
- Access to required Google Cloud services
- WordPress site with REST API enabled

### Local Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run locally: `npm start`

### Testing
- Health check endpoint for service status
- Independent service initialization for easier debugging
- Detailed logging for each service operation

## Security
- All credentials stored in Google Secret Manager
- WordPress authentication using application passwords
- Row-level access to Google Sheets
- OpenAI API key protection

## Logging
- Structured logging format
- Service-specific log prefixes
- Error details for debugging
- Initialization status logging
- Content storage in Google Cloud Storage bucket (`images_free_reports`)
  - Original content backup
  - Enhanced content versions
  - Timestamped JSON files

## Limitations
- OpenAI token limits
- WordPress API rate limits
- Google Sheets API quotas
- Content processing time constraints