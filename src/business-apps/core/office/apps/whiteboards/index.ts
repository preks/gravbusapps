/**
 * Whiteboard Apps Module
 *
 * A collaborative infinite-canvas whiteboard for NEWWORK Business Apps.
 * Features:
 * - Infinite canvas with shapes, text, arrows, sticky notes, freehand drawing
 * - Real-time collaboration with Yjs CRDT and live cursor presence
 * - Share whiteboards with users and links
 * - Favorite, organize, and search whiteboards
 * - Export to PNG/SVG
 */

export { WhiteboardAppsHub, type WhiteboardAppsHubProps } from './WhiteboardAppsHub'

export {
  WhiteboardEditor,
  WhiteboardCollaboratorCursors,
  ShareWhiteboardDialog,
  ManageSharesDialog
} from './components'

export { useWhiteboards, useWhiteboardHubUrlState, useWhiteboardHubFavorites } from './hooks'

export { WhiteboardApiService } from './services'

export type { Whiteboard, WhiteboardSummary, WhiteboardPermission } from './types'

export { WhiteboardAppsHub as default } from './WhiteboardAppsHub'
