export type DriveItemType =
  | 'document'
  | 'note'
  | 'spreadsheet_app'
  | 'slide'
  | 'whiteboard'
  | 'drive_file'
  | 'drive_folder'

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

export interface DriveItemExternalSource {
  connectorName: string
  externalUrl?: string
  kind: string
  isConnected: boolean
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
  externalSource?: DriveItemExternalSource
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

export interface TrashedDriveItemDetail {
  entityType: DriveItemType
  entityId: string
  name: string
  trashedAt: string
  autoDeleteAt: string
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
    case 'whiteboard':
      return 'Scribble'
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
    case 'whiteboard':
      return 'Whiteboard'
    case 'drive_file':
      return 'File'
    case 'drive_folder':
      return 'Folder'
    default:
      return 'Item'
  }
}

const MIME_LABELS: Array<{ test: (mime: string, name: string) => boolean; label: string }> = [
  { test: m => m === 'application/pdf', label: 'PDF' },
  {
    test: (m, n) => m.includes('presentation') || m.includes('powerpoint') || /\.pptx?$/i.test(n) || n.endsWith('.key'),
    label: 'PowerPoint'
  },
  { test: (m, n) => m.includes('spreadsheet') || m.includes('excel') || /\.xlsx?$/i.test(n), label: 'Excel' },
  { test: (m, n) => m === 'text/csv' || n.endsWith('.csv'), label: 'CSV' },
  { test: (m, n) => m === 'application/json' || n.endsWith('.json'), label: 'JSON' },
  { test: (m, n) => m.includes('word') || /\.docx?$/i.test(n), label: 'Word' },
  { test: (m, n) => m.includes('opendocument.text') || n.endsWith('.odt'), label: 'ODT' },
  { test: m => m.startsWith('image/png'), label: 'PNG' },
  { test: m => m.startsWith('image/jpeg') || m.startsWith('image/jpg'), label: 'JPEG' },
  { test: m => m.includes('svg'), label: 'SVG' },
  { test: m => m.startsWith('image/gif'), label: 'GIF' },
  { test: m => m.startsWith('image/webp'), label: 'WebP' },
  { test: m => m.startsWith('image/'), label: 'Image' },
  { test: m => m.startsWith('video/'), label: 'Video' },
  { test: m => m.startsWith('audio/'), label: 'Audio' },
  {
    test: (m, n) =>
      m.includes('zip') ||
      m.includes('gzip') ||
      m.includes('tar') ||
      m.includes('rar') ||
      /\.(zip|gz|tar|rar|7z)$/i.test(n),
    label: 'Archive'
  },
  { test: (_m, n) => /\.(jsx?|tsx?)$/i.test(n), label: 'Code' },
  { test: (_m, n) => /\.(py)$/i.test(n), label: 'Python' },
  { test: (_m, n) => /\.(go)$/i.test(n), label: 'Go' },
  { test: (_m, n) => /\.(rs)$/i.test(n), label: 'Rust' },
  { test: (_m, n) => /\.(java)$/i.test(n), label: 'Java' },
  { test: (_m, n) => /\.(sh|bash|zsh|bat|ps1)$/i.test(n), label: 'Script' },
  { test: m => m === 'text/plain', label: 'Text' },
  { test: m => m === 'text/html' || m === 'application/xhtml+xml', label: 'HTML' },
  { test: m => m === 'text/markdown', label: 'Markdown' }
]

export function getFileTypeLabel(type: DriveItemType, mimeType?: string, name?: string): string {
  if (mimeType || name) {
    const mime = (mimeType ?? '').toLowerCase()
    const n = (name ?? '').toLowerCase()
    for (const entry of MIME_LABELS) {
      if (entry.test(mime, n)) return entry.label
    }
  }
  return getItemLabel(type)
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
