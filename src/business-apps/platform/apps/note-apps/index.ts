/**
 * Note Apps Module
 *
 * A modern, collaborative notes app for NEWWORK Business Apps.
 * Features:
 * - Create and organize notes with folders
 * - Rich text editing with TipTap
 * - Real-time collaboration with Yjs CRDT
 * - Share notes with users and links
 * - Pin, archive, and tag notes
 * - Templates for quick creation
 * - Export to Markdown/HTML/PDF
 */

// Main hub
export { NoteAppsHub, type NoteAppsHubProps } from './NoteAppsHub'
export { NoteEditor, type NoteEditorProps } from './NoteEditor'

// Components
export * from './components'

// Hooks
export * from './hooks'

// Services
export { NoteApiService } from './services'

// Types
export * from './types'

// Utils
export * from './utils'

// Default export for module registration
export { NoteAppsHub as default } from './NoteAppsHub'
