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
  userName?: string
  userAvatar?: string
  role: CollectionMemberRole
  joinedAt: string
  invitedBy?: string
}

export type CollectionMemberRole = 'owner' | 'editor' | 'viewer'
