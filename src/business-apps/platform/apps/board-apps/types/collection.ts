export interface BoardCollection {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic: boolean
  ownerId: string
  memberCount: number
  boardCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionMember {
  id: string
  userId: string
  /** When the API adds members as a team, PATCH/DELETE may need this in the path instead of `userId`. */
  teamId?: string
  userName?: string
  userAvatar?: string
  role: CollectionMemberRole
  joinedAt: string
  invitedBy?: string
}

/** Aligns with document-service / Spaces roles (`admin` is used by Spaces; omitting it caused blank Selects). */
export type CollectionMemberRole = 'owner' | 'admin' | 'editor' | 'viewer'
