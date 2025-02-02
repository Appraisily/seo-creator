const { google } = require('googleapis');
const { getSecret } = require('../utils/secrets');
const { secretNames } = require('../config');

class SheetsService {
  constructor() {
    this.isConnected = false;
    this.sheetsId = null;
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      const credentials = JSON.parse(await getSecret(secretNames.serviceAccountJson));
      this.sheetsId = await getSecret(secretNames.sheetsId);

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ 
        version: 'v4', 
        auth: this.auth 
      });

      // Verify access by trying to get sheet properties
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetsId,
        ranges: ['SEO!A1:B1'],  // Updated to use SEO sheet
        fields: 'sheets.properties.title'
      });

      this.isConnected = true;
      console.log('[SHEETS] Successfully initialized');
    } catch (error) {
      console.error('[SHEETS] Initialization failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async getNextUnprocessedPost() {
    if (!this.isConnected) {
      throw new Error('Google Sheets connection not initialized');
    }
    
    try {
      // Get all rows from the SEO sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetsId,
        range: 'SEO!A:C', // Columns: Keywords, Processed Date, Status
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) { // Only headers or empty
        console.log('[SHEETS] No keywords found in sheet');
        return null;
      }

      // Skip header row and find first unprocessed row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[1]) { // Column B (index 1) is empty - not processed
          console.log('[SHEETS] Found unprocessed keyword in row:', i + 1);
          return {
            keyword: row[0]?.trim() || '',
            rowNumber: i + 1 // Actual spreadsheet row number (1-based)
          };
        }
      }

      console.log('[SHEETS] No unprocessed keywords found');
      return null;
    } catch (error) {
      console.error('[SHEETS] Error getting next unprocessed keyword:', error);
      throw error;
    }
  }

  async markPostAsProcessed(post, status = 'success', error = null) {
    if (!this.isConnected) {
      throw new Error('Google Sheets connection not initialized');
    }
    
    try {
      const rowNumber = post.rowNumber;
      if (!rowNumber) {
        throw new Error('Row number not provided for keyword update');
      }

      // Prepare values for processed date (B), status (C), and WordPress ID (D) columns
      const processedDate = new Date().toISOString();
      const statusMessage = status === 'success' 
        ? 'Success'
        : `Error: ${error?.message || error || 'Unknown error'}`;
      const wordpressId = post.wordpressId || '';

      // Update all columns in a single request
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetsId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `SEO!B${rowNumber}:D${rowNumber}`,
              values: [[processedDate, statusMessage, wordpressId]]
            }
          ]
        }
      });
      
      console.log(`[SHEETS] Updated row ${rowNumber} with status: ${status}, WordPress ID: ${wordpressId}`);
    } catch (error) {
      console.error(`[SHEETS] Error marking row as processed:`, error);
      throw error;
    }
  }

  async findKeywordRow(keyword) {
    if (!this.isConnected) {
      throw new Error('Google Sheets connection not initialized');
    }
    
    try {
      // Get all rows from the SEO sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetsId,
        range: 'SEO!A:C', // Columns: Keywords, Processed Date, Status
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) { // Only headers or empty
        console.log('[SHEETS] No keywords found in sheet');
        return null;
      }

      // Find the row with matching keyword
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]?.trim().toLowerCase() === keyword.toLowerCase()) {
          console.log('[SHEETS] Found keyword in row:', i + 1);
          return {
            keyword: row[0]?.trim() || '',
            rowNumber: i + 1 // Actual spreadsheet row number (1-based)
          };
        }
      }

      console.log('[SHEETS] Keyword not found in sheet');
      return null;
    } catch (error) {
      console.error('[SHEETS] Error finding keyword row:', error);
      throw error;
    }
  }
}

module.exports = new SheetsService();