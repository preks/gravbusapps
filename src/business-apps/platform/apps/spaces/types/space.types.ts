export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

/**
 * Dimension types for creating spaces based on organizational groups
 * Mirrors the dimension types used in group chat creation
 */
export type SpaceDimensionType = 'organization_unit' | 'matrix_team' | 'location' | 'legal_entity' | 'capability'

/**
 * Dimension information stored in space settings
 * Used to link spaces to organizational groups and match with group chats
 */
export interface SpaceDimension {
  type: SpaceDimensionType
  id: string
  name: string
}

export interface SpaceMember {
  id: string
  spaceId: string
  userId: string
  teamId?: string
  role: SpaceMemberRole
  invitedBy?: string
  joinedAt: string
}

export interface SpaceSettings {
  contentCounts?: {
    documents: number
    notes: number
    spreadsheets: number
    slides: number
    total: number
  }
  pinnedItems?: string[]
  /** Dimension info when space is created based on an organizational group */
  dimension?: SpaceDimension
  /** ID of the linked group chat conversation (if created from same dimension) */
  linkedConversationId?: string
  /** Linked internal calendar metadata for this space */
  calendar?: SpaceCalendarLink
  [key: string]: unknown
}

export interface SpaceCalendarLink {
  id: string
  name: string
  color?: string
  type?: 'space' | 'shared'
}

export interface Space {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic: boolean
  settings: SpaceSettings
  ownerId: string
  members?: SpaceMember[]
  // Content items - populated when fetched with includeContent=true
  documents?: SpaceContentItem[]
  notes?: SpaceContentItem[]
  spreadsheets?: SpaceContentItem[]
  slides?: SpaceContentItem[]
  content?: SpaceContentItem[] // Combined content array from backend
  createdAt: string
  updatedAt: string
}

export interface SpaceContentItem {
  id: string
  type: 'document' | 'note' | 'spreadsheet' | 'slide' | 'drive_file'
  title: string
  description?: string
  updatedAt: string
  createdAt: string
  ownerId: string
  spaceId?: string
  folderId?: string | null
  isPdf?: boolean // For PDF documents
}

export interface SpaceFolder {
  id: string
  spaceId: string
  parentId?: string | null
  name: string
  position: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateSpaceFolderInput {
  name: string
  parentId?: string
  position?: number
}

export interface UpdateSpaceFolderInput {
  name?: string
  parentId?: string | null
  position?: number
}

export interface SpaceActivity {
  id: string
  spaceId: string
  userId: string
  userName: string
  userAvatar?: string
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'moved' | 'commented' | 'uploaded'
  entityType: 'document' | 'note' | 'spreadsheet' | 'slide' | 'space' | 'file' | 'folder'
  entityId: string
  entityTitle: string
  metadata?: Record<string, any>
  timestamp: string
}

export interface CreateSpaceInput {
  name: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic?: boolean
  /** Dimension info when creating space based on an organizational group */
  dimension?: SpaceDimension
  /** User IDs to automatically add as members (for dimension-based creation) */
  memberIds?: string[]
  /** Whether a linked internal calendar should be created for this space */
  createCalendar?: boolean
  /** Optional custom name for the linked space calendar */
  calendarName?: string
}

export interface UpdateSpaceInput {
  name?: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic?: boolean
  settings?: Partial<SpaceSettings>
}

export interface AddMemberInput {
  userId?: string
  teamId?: string
  role: SpaceMemberRole
}

export interface MoveContentInput {
  contentType: 'document' | 'note' | 'spreadsheet' | 'slide' | 'drive_file'
  entityId: string
  targetSpaceId?: string
  folderId?: string | null
}

export interface SpaceStats {
  totalDocuments: number
  totalNotes: number
  totalSpreadsheets: number
  totalSlides: number
  totalContent: number
  totalMembers: number
  recentActivity: number
}

/**
 * Linked conversation interface for team collaboration
 * Represents a group chat linked to a space via dimension context
 */
export interface LinkedConversation {
  id: string
  name: string
  description?: string
  type: 'group'
  contextEntity?: string
  contextEntityId?: string
  participantCount?: number
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
}
