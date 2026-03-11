/**
 * Environment-aware spreadsheet app base paths.
 * Production/dev (newwork-dev, prod): /platform/spreadsheets
 * Local development (localhost): /platform/apps/spreadsheet-apps
 */

const SPREADSHEET_PATH_PROD = '/platform/spreadsheets'
const SPREADSHEET_PATH_DEV = '/platform/apps/spreadsheet-apps'

/**
 * Get the canonical base path for the spreadsheet app.
 * Use this when building URLs for sharing, copy links, etc.
 */
export function getSpreadsheetBasePath(): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return isProduction ? SPREADSHEET_PATH_PROD : SPREADSHEET_PATH_DEV
}

/**
 * Check if a pathname is a valid spreadsheet app path (for open-redirect guards).
 * Accepts both production (/platform/spreadsheets) and dev (/platform/apps/spreadsheet-apps) paths.
 */
export function isAllowedSpreadsheetPath(pathname: string): boolean {
  return pathname.startsWith(SPREADSHEET_PATH_PROD) || pathname.startsWith(SPREADSHEET_PATH_DEV)
}
