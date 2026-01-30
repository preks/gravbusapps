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
  content?: SpaceContentItem[] // Combined content array from backend
  createdAt: string
  updatedAt: string
}

export interface SpaceContentItem {
  id: string
  type: 'document' | 'note' | 'spreadsheet'
  title: string
  description?: string
  updatedAt: string
  createdAt: string
  ownerId: string
  spaceId?: string
}

export interface SpaceActivity {
  id: string
  spaceId: string
  userId: string
  userName: string
  userAvatar?: string
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'moved' | 'commented'
  entityType: 'document' | 'note' | 'spreadsheet' | 'space'
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
  contentType: 'document' | 'note' | 'spreadsheet'
  entityId: string
  targetSpaceId?: string
}

export interface SpaceStats {
  totalDocuments: number
  totalNotes: number
  totalSpreadsheets: number
  totalContent: number
  totalMembers: number
  recentActivity: number
}
