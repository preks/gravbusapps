/**
 * Every Desk Module
 *
 * A unified landing page for all content creation apps:
 * Documents, Spreadsheets, and Notes.
 */

// Main hub
export { DeskHub, type DeskHubProps } from './DeskHub'

// Hooks
export { useDeskData, type ContentItem, type DeskStats, type ActivityDataPoint } from './hooks/useDeskData'

// Default export for module registration
export { DeskHub as default } from './DeskHub'
