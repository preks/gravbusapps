export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
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

export interface Space {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic: boolean
  settings: {
    contentCounts?: {
      documents: number
      notes: number
      spreadsheets: number
      slides: number
      total: number
    }
    pinnedItems?: string[]
    [key: string]: any
  }
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
  type: 'document' | 'note' | 'spreadsheet' | 'slide'
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
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'moved' | 'commented'
  entityType: 'document' | 'note' | 'spreadsheet' | 'slide' | 'space'
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
}

export interface UpdateSpaceInput {
  name?: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic?: boolean
  settings?: Record<string, any>
}

export interface AddMemberInput {
  userId?: string
  teamId?: string
  role: SpaceMemberRole
}

export interface MoveContentInput {
  contentType: 'document' | 'note' | 'spreadsheet' | 'slide'
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
