/**
 * Utility functions for Google Sheets operations
 */

/**
 * Find a sheet by its title in a Google Spreadsheet
 * @param {GoogleSpreadsheet} doc - The Google Spreadsheet document
 * @param {string} title - The title of the sheet to find
 * @returns {GoogleSpreadsheetWorksheet|null} The found sheet or null
 */
function findSheetByTitle(doc, title) {
  const sheets = doc.sheetsByTitle;
  return sheets[title] || null;
}

module.exports = {
  findSheetByTitle
};