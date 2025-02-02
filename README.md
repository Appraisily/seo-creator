# SEO Content Enhancement Service

## Overview
This service automatically generates SEO-optimized content using OpenAI's GPT and DALL-E 3 models. It processes keywords from a Google Sheets document, generates structured content, and creates complete HTML posts with AI-generated images.

## Architecture

### Core Services
1. **Google Sheets Service**
   - Tracks keywords and their processing status
   - Uses Google Cloud's application default credentials

2. **OpenAI Service**
   - Generates content using GPT models
   - Creates images using DALL-E 3
   - API key stored in Google Secret Manager

3. **Content Generation Service**
   - Manages content structure and generation
   - Coordinates between services

4. **WordPress Service**
   - Handles post creation and image uploads
   - Manages WordPress API integration

### Storage Structure
Content is stored in Google Cloud Storage with the following organization:
```
images_free_reports/
├── seo/
│   ├── keywords/
│   │   └── {keyword-slug}/
│   │       ├── structure.json  # Initial content structure
│   │       ├── content.json    # Generated content
│   │       └── composed.json   # Final HTML with images
│   └── logs/
│       └── {date}/
│           └── errors.json
```

## Step-by-Step Content Creation Process

### 1. Process New Keyword
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/process
```

This endpoint:
1. Fetches the next unprocessed keyword from Google Sheets
2. Generates initial content structure
3. Creates detailed content
4. Generates and integrates AI images
5. Creates WordPress post
6. Updates processing status in sheets

#### Content Generation Flow:
1. **Initial Structure Generation**
   ```json
   {
     "title": "SEO-optimized title",
     "slug": "url-friendly-slug",
     "meta": {
       "title": "SEO meta title",
       "description": "Meta description",
       "focus_keyword": "primary keyword"
     },
     "outline": [
       {
         "type": "section",
         "title": "Section title",
         "key_points": ["point 1", "point 2"]
       }
     ]
   }
   ```

2. **Image Generation and Integration**
   - Creates DALL-E 3 images based on descriptions
   - Uploads images to WordPress
   - Returns WordPress image URLs and metadata

3. **Detailed Content Generation**
   ```json
   {
     "title": "Post title",
     "slug": "url-friendly-slug",
     "meta": {
       "title": "SEO title",
       "description": "Meta description",
       "focus_keyword": "primary keyword"
     },
     "content": {
       "html": "Full HTML content with integrated WordPress image URLs"
     }
   }
   ```

4. **WordPress Post Creation**
   - Creates draft post with:
     - SEO meta information
     - Featured image
     - Structured content
     - Schema.org markup

### 2. Generate Content for Specific Keyword
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"keyword":"your-keyword-here"}'
```

### 3. Compose HTML with Images
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/compose-html \
  -H "Content-Type: application/json" \
  -d '{"keyword":"your-keyword-here"}'
```

### 4. Recover Failed Post
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/recovery/{date}/{keyword}
```

### 5. Test WordPress Integration
```bash
curl -X POST https://seo-creator-856401495068.us-central1.run.app/api/test/wordpress
```

## Configuration

### Environment Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PROJECT_ID` | Google Cloud project ID | Yes | - |
| `PORT` | Server port | No | 8080 |

### Required Secrets in Google Secret Manager
| Secret Name | Description |
|-------------|-------------|
| `SHEETS_ID_SEO` | Google Sheets document ID |
| `OPEN_AI_API_SEO` | OpenAI API key |
| `service-account-json` | Google service account credentials |

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

### Health Check
```bash
curl https://seo-creator-856401495068.us-central1.run.app/health
```

Returns:
- Service status
- Connection status for all services

## Limitations
- OpenAI API rate limits
- Google Sheets API quotas
- DALL-E 3 image generation limits
- Content processing time constraints