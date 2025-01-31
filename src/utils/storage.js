const { Storage } = require('@google-cloud/storage');

class ContentStorage {
  constructor() {
    this.storage = new Storage();
    this.bucketName = 'images_free_reports';
    console.log('[STORAGE] Initializing storage service with bucket:', this.bucketName);
  }

  async initialize() {
    try {
      console.log('[STORAGE] Attempting to connect to bucket:', this.bucketName);
      const [bucket] = await this.storage.bucket(this.bucketName).get();
      this.bucket = bucket;
      console.log('[STORAGE] Successfully initialized bucket:', this.bucketName);
      console.log('[STORAGE] Bucket metadata:', bucket.metadata);
      return true;
    } catch (error) {
      console.error('[STORAGE] Initialization failed for bucket:', this.bucketName);
      console.error('[STORAGE] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async storeContent(postId, content, type = 'original') {
    console.log('[STORAGE] Starting content storage process:', {
      postId,
      type,
      contentSize: JSON.stringify(content).length
    });

    const timestamp = Date.now();
    const version = type.includes('enhanced') ? `-${type.split('-')[1] || 'v1'}` : '';
    const fileName = `seo_content/${postId}/${type}${version}-${timestamp}.json`;
    console.log('[STORAGE] Generated filename:', fileName);

    const file = this.bucket.file(fileName);
    
    const metadata = {
      contentType: 'application/json',
      metadata: {
        postId,
        type,
        version: version || 'original',
        timestamp: new Date().toISOString(),
        contentLength: JSON.stringify(content).length,
        storagePath: fileName
      }
    };

    try {
      console.log('[STORAGE] Attempting to save file with metadata:', metadata);
      await file.save(JSON.stringify(content, null, 2), {
        metadata,
        resumable: false
      });
      
      console.log('[STORAGE] Successfully stored content:', {
        fileName,
        type,
        postId,
        timestamp: metadata.metadata.timestamp
      });

      // Verify the file was saved
      const [exists] = await file.exists();
      console.log('[STORAGE] File existence verification:', {
        fileName,
        exists,
        size: (await file.getMetadata())[0].size
      });

      return fileName;
    } catch (error) {
      console.error('[STORAGE] Failed to store content:', {
        fileName,
        type,
        postId,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  async getContent(fileName) {
    console.log('[STORAGE] Attempting to retrieve content:', fileName);
    
    try {
      const file = this.bucket.file(fileName);
      
      // Check if file exists before attempting download
      const [exists] = await file.exists();
      if (!exists) {
        console.error('[STORAGE] File not found:', fileName);
        throw new Error(`File not found: ${fileName}`);
      }

      console.log('[STORAGE] File found, retrieving content...');
      const [content] = await file.download();
      
      const contentString = content.toString();
      console.log('[STORAGE] Content retrieved successfully:', {
        fileName,
        contentSize: contentString.length,
        isJson: this.isValidJson(contentString)
      });

      return JSON.parse(contentString);
    } catch (error) {
      console.error('[STORAGE] Error retrieving content:', {
        fileName,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = new ContentStorage();