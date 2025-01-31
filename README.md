# SEO Content Enhancement Service

## Overview
This service automatically generates SEO-optimized content using OpenAI's GPT and DALL-E 3 models. It processes keywords from a Google Sheets document, generates structured content, and creates complete HTML posts with AI-generated images. The service is deployed at:

```
https://seo-creator-856401495068.us-central1.run.app
```

## Architecture

### Services
The application is built with four core services:

1. **Google Sheets Service**
   - Connects to a Google Spreadsheet containing keywords to process
   - Tracks processing status and results
   - Uses Google Cloud's application default credentials

2. **OpenAI Service**
   - Generates content using GPT models
   - Creates images using DALL-E 3
   - Handles function calling for image generation
   - API key stored in Google Secret Manager

3. **Content Service**
   - Manages the content generation workflow
   - Handles schema creation and content structuring
   - Coordinates between services

4. **Composer Service**
   - Generates final HTML output
   - Integrates AI-generated images
   - Adds schema.org markup
   - Creates meta information

### Storage Structure
Content is stored in Google Cloud Storage with the following organization:

```
images_free_reports/
├── seo/
│   ├── keywords/
│   │   └── {keyword-slug}/
│   │       ├── schema.json    # Content structure
│   │       ├── content.json   # Generated content
│   │       └── html.json      # Final HTML with images
│   └── logs/
│       └── {date}/
│           └── errors.json
```

### Key Components

- `src/server.js`: Application entry point with service initialization
- `src/app.js`: Express application setup and health check endpoint
- `src/controllers/`: Request handlers and business logic
- `src/services/`: Core service implementations
- `src/utils/`: Utility functions and storage management

## Content Generation Process

### 1. Schema Generation
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/process
```
- Fetches next unprocessed keyword from Google Sheets
- Generates optimal content structure based on keyword intent
- Stores schema in `seo/keywords/{keyword-slug}/schema.json`

### 2. Content Generation
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"keyword": "your-keyword-here"}'
```
- Reads schema from storage
- Generates SEO-optimized content following the schema
- Stores content in `seo/keywords/{keyword-slug}/content.json`

### 3. HTML Composition
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/compose-html \
  -H "Content-Type: application/json" \
  -d '{"keyword": "your-keyword-here"}'
```
- Reads generated content
- Creates semantic HTML structure
- Generates and integrates AI images
- Adds schema.org markup
- Stores result in `seo/keywords/{keyword-slug}/html.json`

## Configuration

### Environment Variables
The following runtime environment variables must be configured:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PROJECT_ID` | Google Cloud project ID | Yes | - |
| `PORT` | Server port | No | 8080 |

### Required Secrets
The following secrets must be configured in Google Secret Manager:

| Secret Name | Description |
|-------------|-------------|
| `SHEETS_ID_SEO` | Google Sheets document ID |
| `OPEN_AI_API_SEO` | OpenAI API key |
| `service-account-json` | Google service account credentials |

## API Endpoints

### POST /api/process
Triggers schema generation for the next unprocessed keyword.

### POST /api/generate-content
Generates content based on the stored schema.

### POST /api/compose-html
Creates the final HTML post with AI-generated images.

### GET /health
Health check endpoint that returns:
- Service status
- Connection status for all services

Example:
```bash
curl https://seo-creator-856401495068.us-central1.run.app/health
```

## Development

### Prerequisites
- Node.js 18+
- Google Cloud SDK
- Access to required Google Cloud services
- OpenAI API access

### Local Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set environment variables:
   ```
   PROJECT_ID=your-project-id
   ```
4. Run locally: `npm start`

### Testing
- Health check endpoint for service status
- Independent service initialization
- Detailed logging for each phase
- Content storage in Google Cloud Storage

## Security
- All credentials stored in Google Secret Manager
- Row-level access to Google Sheets
- OpenAI API key protection
- Secure storage in Google Cloud Storage

## Logging
- Structured logging format
- Service-specific log prefixes
- Error details for debugging
- Process tracking in storage

## Limitations
- OpenAI API rate limits
- Google Sheets API quotas
- DALL-E 3 image generation limits
- Content processing time constraints