export interface Whiteboard {
  id: string
  title: string
  description?: string
  sceneData?: Record<string, unknown>
  contentJson?: Record<string, unknown>
  settings: Record<string, unknown>
  ownerId: string
  spaceId?: string
  folderId?: string | null
  currentVersion: number
  trashedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface WhiteboardSummary extends Whiteboard {
  isOwner?: boolean
  isShared?: boolean
  sharedBy?: string
  permission?: WhiteboardPermission
}

export type WhiteboardPermission = 'view' | 'comment' | 'edit' | 'admin'
