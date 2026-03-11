export type DriveItemType = 'document' | 'note' | 'spreadsheet_app' | 'slide' | 'drive_file' | 'drive_folder'

export type DriveSection = 'my-drive' | 'shared' | 'recent' | 'favorites' | 'trash'

export type DriveSortBy = 'name' | 'updatedAt' | 'createdAt' | 'size'

export type DriveViewMode = 'grid' | 'list'

export interface DriveFolder {
  id: string
  name: string
  parentId: string | null
  ownerId: string
  position: number
  color?: string
  icon?: string
  isShared?: boolean
  trashedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface DriveItem {
  id: string
  type: DriveItemType
  name: string
  ownerId: string
  folderId: string | null
  spaceId: string | null
  spaceFolderId: string | null
  mimeType?: string
  fileSize?: number
  isFavorite?: boolean
  isShared?: boolean
  isShortcut?: boolean
  shortcutId?: string
  createdAt: string
  updatedAt: string
  trashedAt?: string | null
}

export interface DriveShortcut {
  id: string
  ownerId: string
  folderId: string | null
  targetEntityType: string
  targetEntityId: string
  name: string | null
  createdAt: string
}

export interface DriveListResult {
  items: DriveItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DriveSearchResult {
  id: string
  type: string
  name: string
  ownerId: string
  spaceId: string | null
  snippet?: string
  relevanceScore: number
  matchType: 'exact' | 'keyword' | 'semantic'
  updatedAt: string
}

export interface DriveFavorite {
  id: string
  userId: string
  entityType: string
  entityId: string
  createdAt: string
}

export interface DriveBreadcrumb {
  id: string
  name: string
  parentId: string | null
}

export interface ShareInfo {
  id: string
  entityType: string
  entityId: string
  userId: string
  permission: 'view' | 'comment' | 'edit' | 'admin'
  sharedBy: string
  message?: string
  expiresAt?: string
  isAccepted?: boolean
  createdAt: string
}

export interface ShareLinkInfo {
  id: string
  entityType: string
  entityId: string
  token: string
  permission: 'view' | 'comment' | 'edit' | 'admin'
  expiresAt?: string
  maxUses?: number
  useCount: number
  isActive: boolean
  createdBy: string
  name?: string
  createdAt: string
}

export function getItemIcon(type: DriveItemType): string {
  switch (type) {
    case 'document':
      return 'FileText'
    case 'note':
      return 'StickyNote'
    case 'spreadsheet_app':
      return 'Table2'
    case 'slide':
      return 'Presentation'
    case 'drive_file':
      return 'File'
    case 'drive_folder':
      return 'Folder'
    default:
      return 'File'
  }
}

export function getItemLabel(type: DriveItemType): string {
  switch (type) {
    case 'document':
      return 'Document'
    case 'note':
      return 'Note'
    case 'spreadsheet_app':
      return 'Spreadsheet'
    case 'slide':
      return 'Slides'
    case 'drive_file':
      return 'File'
    case 'drive_folder':
      return 'Folder'
    default:
      return 'Item'
  }
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
