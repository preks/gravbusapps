/**
 * Spaces Module
 *
 * Collaborative workspaces for documents, notes, and spreadsheets
 */

// Main router (handles URL-based routing)
export { SpacesRouter } from './SpacesRouter'

// Main components
export { SpacesHub } from './SpacesHub'
export { SpaceDetail } from './SpaceDetail'

// Sub-components
export { SpaceCard, SpaceHero, SpaceStats, SpaceActivity, SpacePinned, SpaceMembers, SpaceContent } from './components'

// Hooks
export { useSpaces } from './hooks/useSpaces'
export { useSpace } from './hooks/useSpace'
export { useSpaceContent } from './hooks/useSpaceContent'
export { useSpaceActivity } from './hooks/useSpaceActivity'

// Types
export type {
  Space,
  SpaceMember,
  SpaceMemberRole,
  SpaceContentItem,
  SpaceActivity as SpaceActivityType,
  SpaceStats as SpaceStatsType,
  CreateSpaceInput,
  UpdateSpaceInput,
  AddMemberInput,
  MoveContentInput
} from './types/space.types'

// Default export for module registration - uses SpacesRouter for URL-based routing
export { SpacesRouter as default } from './SpacesRouter'
