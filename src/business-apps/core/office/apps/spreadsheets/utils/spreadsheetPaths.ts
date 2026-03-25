/**
 * Environment-aware spreadsheet app base paths.
 * Production/dev (newwork-dev, prod): /platform/every-office/spreadsheets
 * Local development (localhost): /platform/apps/spreadsheet-apps
 */

const SPREADSHEET_PATH_PROD = '/platform/every-office/spreadsheets'
const SPREADSHEET_PATH_LEGACY = '/platform/spreadsheets'
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
 * Accepts canonical production path, legacy production path, and local dev path.
 */
export function isAllowedSpreadsheetPath(pathname: string): boolean {
  return (
    pathname.startsWith(SPREADSHEET_PATH_PROD) ||
    pathname.startsWith(SPREADSHEET_PATH_LEGACY) ||
    pathname.startsWith(SPREADSHEET_PATH_DEV)
  )
}
