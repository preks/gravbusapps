import React, { useState } from 'react'
import { Badge } from '@newwork/nw-design-system'
import {
  FileText,
  StickyNote,
  Table2,
  Presentation,
  File,
  Image as ImageIcon,
  Folder,
  Pencil,
  Trash2,
  Share2,
  Users,
  CloudDownload,
  FileJson,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileTerminal
} from 'lucide-react'
import type { DriveItem, DriveFolder, DriveViewMode, DriveSection } from '../types/drive.types'
import { getFileTypeLabel, formatFileSize } from '../types/drive.types'
import type { SelectModifiers } from '../hooks/useDriveSelection'
import { DriveListItemActions } from './DriveListItemActions'

const DRAG_MIME = 'application/x-drive-items'

export interface DriveContentGridProps {
  items: DriveItem[]
  folders: DriveFolder[]
  viewMode: DriveViewMode
  section: DriveSection
  onItemClick: (item: DriveItem) => void
  onFolderClick: (folder: DriveFolder) => void
  onToggleFavorite: (entityType: string, entityId: string, isFav: boolean) => void
  onTrashItem: (item: DriveItem) => void
  onRestoreItem?: (item: DriveItem) => void
  onDownloadItem?: (item: DriveItem) => void
  onRenameItem?: (item: DriveItem) => void
  onRenameFolder?: (folder: DriveFolder) => void
  onShareItem?: (item: DriveItem) => void
  onShareFolder?: (folder: DriveFolder) => void
  selectedKeys?: Set<string>
  onSelect?: (key: string, modifiers: SelectModifiers) => void
  onSelectOnly?: (key: string) => void
  onMoveToFolder?: (targetFolderId: string, refs: Array<{ entityType: string; entityId: string }>) => void
  onAddToMyDrive?: (entityType: string, entityId: string) => void
  onRemoveShortcut?: (shortcutId: string) => void
  t: (key: string, args?: Record<string, string | number>) => string
  locale?: string
  'data-testid'?: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  note: StickyNote,
  spreadsheet_app: Table2,
  slide: Presentation,
  drive_file: File,
  drive_folder: Folder
}

const TYPE_COLORS: Record<string, string> = {
  document: 'gba:text-info',
  note: 'gba:text-warning',
  spreadsheet_app: 'gba:text-success',
  slide: 'gba:text-destructive',
  drive_file: 'gba:text-muted-foreground',
  drive_folder: 'gba:text-primary'
}

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M8 4C8 2.89543 8.89543 2 10 2H24L32 10V36C32 37.1046 31.1046 38 30 38H10C8.89543 38 8 37.1046 8 36V4Z"
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.5"
    />
    <path d="M24 2L32 10H26C24.8954 10 24 9.10457 24 8V2Z" fill="currentColor" fillOpacity="0.15" />
    <rect x="10" y="22" rx="2" width="20" height="12" fill="hsl(var(--destructive))" />
    <text
      x="20"
      y="31.5"
      textAnchor="middle"
      fill="hsl(var(--destructive-foreground))"
      fontSize="7.5"
      fontWeight="700"
      fontFamily="system-ui, sans-serif"
    >
      PDF
    </text>
  </svg>
)

const MIME_ICON_MAP: Array<{
  test: (mime: string, name: string) => boolean
  icon: React.ElementType
  color: string
}> = [
  { test: m => m.startsWith('image/'), icon: ImageIcon, color: 'gba:text-primary' },
  { test: m => m === 'application/pdf', icon: PdfIcon, color: 'gba:text-destructive' },
  {
    test: (m, n) =>
      m.includes('presentation') ||
      m.includes('powerpoint') ||
      n.endsWith('.pptx') ||
      n.endsWith('.ppt') ||
      n.endsWith('.key'),
    icon: Presentation,
    color: 'gba:text-warning'
  },
  {
    test: (m, n) =>
      m.includes('spreadsheet') ||
      m.includes('excel') ||
      m === 'text/csv' ||
      n.endsWith('.xlsx') ||
      n.endsWith('.xls') ||
      n.endsWith('.csv'),
    icon: FileSpreadsheet,
    color: 'gba:text-success'
  },
  {
    test: (m, n) => m === 'application/json' || n.endsWith('.json'),
    icon: FileJson,
    color: 'gba:text-info'
  },
  { test: m => m.startsWith('video/'), icon: FileVideo, color: 'gba:text-destructive' },
  { test: m => m.startsWith('audio/'), icon: FileAudio, color: 'gba:text-warning' },
  {
    test: (m, n) =>
      m.includes('zip') ||
      m.includes('gzip') ||
      m.includes('tar') ||
      m.includes('rar') ||
      m.includes('7z') ||
      n.endsWith('.zip') ||
      n.endsWith('.gz') ||
      n.endsWith('.tar') ||
      n.endsWith('.rar') ||
      n.endsWith('.7z'),
    icon: FileArchive,
    color: 'gba:text-muted-foreground'
  },
  {
    test: (_m, n) => /\.(jsx?|tsx?|py|rb|go|rs|java|c|cpp|cs|php|swift|kt)$/i.test(n),
    icon: FileCode,
    color: 'gba:text-info'
  },
  {
    test: (_m, n) => /\.(sh|bash|zsh|bat|ps1)$/i.test(n),
    icon: FileTerminal,
    color: 'gba:text-muted-foreground'
  },
  {
    test: (m, n) =>
      m.includes('word') ||
      m.includes('opendocument.text') ||
      n.endsWith('.docx') ||
      n.endsWith('.doc') ||
      n.endsWith('.odt'),
    icon: FileText,
    color: 'gba:text-info'
  }
]

function resolveIconAndColor(item: DriveItem): { Icon: React.ElementType; color: string } {
  if (item.type === 'drive_file' || (item.mimeType && item.type !== 'drive_folder')) {
    const mime = (item.mimeType ?? '').toLowerCase()
    const name = (item.name ?? '').toLowerCase()
    for (const entry of MIME_ICON_MAP) {
      if (entry.test(mime, name)) {
        return { Icon: entry.icon, color: entry.color }
      }
    }
  }
  return {
    Icon: TYPE_ICONS[item.type] ?? File,
    color: TYPE_COLORS[item.type] ?? 'gba:text-muted-foreground'
  }
}

function formatDate(
  dateStr: string,
  t: (key: string, args?: Record<string, string | number>) => string,
  locale?: string
): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const effectiveLocale = locale || undefined

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago-count', { count: diffDays })

  return date.toLocaleDateString(effectiveLocale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function localizeFileTypeLabel(
  label: string,
  t: (key: string, args?: Record<string, string | number>) => string
): string {
  switch (label) {
    case 'Document':
      return t('type-label-document')
    case 'Note':
      return t('type-label-note')
    case 'Spreadsheet':
      return t('type-label-spreadsheet')
    case 'Slides':
      return t('type-label-slides')
    case 'Whiteboard':
      return t('type-label-whiteboard')
    case 'File':
      return t('type-label-file')
    case 'Folder':
      return t('type-label-folder')
    case 'Image':
      return t('type-label-image')
    case 'Video':
      return t('type-label-video')
    case 'Audio':
      return t('type-label-audio')
    case 'Archive':
      return t('type-label-archive')
    case 'Code':
      return t('type-label-code')
    case 'Script':
      return t('type-label-script')
    case 'Text':
      return t('type-label-text')
    default:
      return label
  }
}

function refsFromKeys(keys: Set<string>): Array<{ entityType: string; entityId: string }> {
  return Array.from(keys).map(k => {
    const i = k.indexOf(':')
    return { entityType: k.substring(0, i), entityId: k.substring(i + 1) }
  })
}

export const DriveContentGrid: React.FC<DriveContentGridProps> = ({
  items,
  folders,
  viewMode,
  section,
  onItemClick,
  onFolderClick,
  onToggleFavorite,
  onTrashItem,
  onRestoreItem,
  onDownloadItem,
  onRenameItem,
  onRenameFolder,
  onShareItem,
  onShareFolder,
  selectedKeys,
  onSelect,
  onSelectOnly,
  onMoveToFolder,
  onAddToMyDrive,
  onRemoveShortcut,
  t,
  locale,
  'data-testid': testId = 'drive-content'
}) => {
  const isTrash = section === 'trash'
  const hasContent = folders.length > 0 || items.length > 0
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const sel = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(key, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })
  }

  const startDrag = (e: React.DragEvent, entityType: string, entityId: string) => {
    const key = `${entityType}:${entityId}`
    let refs: Array<{ entityType: string; entityId: string }>
    if (selectedKeys?.has(key) && selectedKeys.size > 0) {
      refs = refsFromKeys(selectedKeys)
    } else {
      refs = [{ entityType, entityId }]
      onSelectOnly?.(key)
    }
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(refs))
    e.dataTransfer.effectAllowed = 'move'
    if (refs.length > 1) {
      const badge = document.createElement('div')
      badge.textContent = `${refs.length} items`
      badge.style.cssText =
        'padding:6px 14px;border-radius:8px;background:var(--primary);color:var(--primary-foreground);font-size:13px;position:fixed;top:-100px'
      document.body.appendChild(badge)
      e.dataTransfer.setDragImage(badge, 0, 0)
      setTimeout(() => badge.remove(), 0)
    }
  }

  const folderDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const folderDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    const data = e.dataTransfer.getData(DRAG_MIME)
    if (!data) return
    const refs = JSON.parse(data) as Array<{ entityType: string; entityId: string }>
    if (refs.some(r => r.entityType === 'drive_folder' && r.entityId === targetId)) return
    onMoveToFolder?.(targetId, refs)
  }

  const isSelected = (key: string) => selectedKeys?.has(key) ?? false
  const selectedCls = 'gba:ring-2 gba:ring-primary gba:bg-primary/5'
  const dropTargetCls = 'gba:ring-2 gba:ring-primary gba:bg-primary/10'

  if (!hasContent) {
    return (
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20"
        data-testid={`${testId}-empty`}
      >
        <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-4">
          <Folder className="gba:w-8 gba:h-8 gba:text-muted-foreground/50" />
        </div>
        <p className="gba:text-base gba:font-medium gba:text-foreground gba:mb-1">{t(`empty-${section}`)}</p>
        <p className="gba:text-sm gba:text-muted-foreground">{t(`empty-${section}-desc`)}</p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div data-testid={testId}>
        {folders.length > 0 && (
          <div className="gba:mb-6">
            <h3 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-3">
              {t('section-folders')}
            </h3>
            <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-5 gba:gap-3">
              {folders.map(folder => {
                const key = `drive_folder:${folder.id}`
                return (
                  <button
                    key={folder.id}
                    onClick={e => sel(key, e)}
                    onDoubleClick={() => onFolderClick(folder)}
                    draggable={!isTrash}
                    onDragStart={e => startDrag(e, 'drive_folder', folder.id)}
                    onDragOver={folderDragOver}
                    onDragEnter={() => setDragOverFolderId(folder.id)}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverFolderId(null)
                    }}
                    onDrop={e => folderDrop(e, folder.id)}
                    className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-xl gba:border gba:border-border/50 gba:bg-card gba:hover:bg-accent/50 gba:transition-colors gba:text-left ${isSelected(key) ? selectedCls : ''} ${dragOverFolderId === folder.id ? dropTargetCls : ''}`}
                    data-testid={`${testId}-folder-${folder.id}`}
                  >
                    <Folder className="gba:w-8 gba:h-8 gba:text-primary gba:flex-shrink-0" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{folder.name}</span>
                    {folder.isShared && (
                      <Users className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {items.length > 0 && (
          <div>
            <h3 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-3">
              {t('section-files')}
            </h3>
            <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-5 gba:gap-3">
              {items.map(item => {
                const { Icon, color } = resolveIconAndColor(item)
                const key = `${item.type}:${item.id}`
                return (
                  <button
                    key={key}
                    onClick={e => sel(key, e)}
                    onDoubleClick={() => onItemClick(item)}
                    draggable={!isTrash}
                    onDragStart={e => startDrag(e, item.type, item.id)}
                    className={`gba:flex gba:flex-col gba:items-center gba:gap-2 gba:p-4 gba:rounded-xl gba:border gba:border-border/50 gba:bg-card gba:hover:bg-accent/50 gba:transition-colors gba:text-center gba:group ${isSelected(key) ? selectedCls : ''}`}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <Icon className={`gba:w-10 gba:h-10 ${color}`} />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:w-full">
                      {item.name}
                    </span>
                    <div className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap gba:justify-center">
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {localizeFileTypeLabel(getFileTypeLabel(item.type, item.mimeType, item.name), t)}
                      </span>
                      {item.externalSource && (
                        <Badge variant="info" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:gap-0.5">
                          <CloudDownload className="gba:w-2 gba:h-2" />
                          {t('badge-imported')}
                        </Badge>
                      )}
                      {item.isShared && (
                        <Badge variant="secondary" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:gap-0.5">
                          <Users className="gba:w-2 gba:h-2" />
                          {t('shared-folder-badge')}
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gba:space-y-0.5" data-testid={testId}>
      {folders.map(folder => {
        const key = `drive_folder:${folder.id}`
        return (
          <div
            key={folder.id}
            onClick={e => sel(key, e)}
            onDoubleClick={() => onFolderClick(folder)}
            draggable={!isTrash}
            onDragStart={e => startDrag(e, 'drive_folder', folder.id)}
            onDragOver={folderDragOver}
            onDragEnter={() => setDragOverFolderId(folder.id)}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverFolderId(null)
            }}
            onDrop={e => folderDrop(e, folder.id)}
            className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:rounded-lg gba:hover:bg-accent/50 gba:transition-colors gba:group gba:cursor-pointer ${isSelected(key) ? selectedCls : ''} ${dragOverFolderId === folder.id ? dropTargetCls : ''}`}
            data-testid={`${testId}-folder-${folder.id}`}
          >
            <Folder className="gba:w-5 gba:h-5 gba:text-primary gba:flex-shrink-0" />
            <span className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1.5">
              <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{folder.name}</span>
              {folder.isShared && (
                <Badge variant="secondary" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:gap-0.5 gba:shrink-0">
                  <Users className="gba:w-2 gba:h-2" />
                  {t('shared-folder-badge')}
                </Badge>
              )}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right gba:hidden gba:sm:block">
              {t('type-label-folder')}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-20 gba:text-right gba:hidden gba:md:block">
              &mdash;
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right">
              {formatDate(folder.updatedAt, t, locale)}
            </span>
            <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end gba:w-48">
              {!isTrash && onRenameFolder && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onRenameFolder(folder)
                  }}
                  className="gba:p-1 gba:rounded gba:hover:bg-accent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                  data-testid={`${testId}-rename-folder-${folder.id}`}
                >
                  <Pencil className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                </button>
              )}
              {!isTrash && onShareFolder && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onShareFolder(folder)
                  }}
                  className="gba:p-1 gba:rounded gba:hover:bg-accent gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                  data-testid={`${testId}-share-folder-${folder.id}`}
                >
                  <Share2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                </button>
              )}
              {!isTrash && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onTrashItem({
                      id: folder.id,
                      type: 'drive_folder',
                      name: folder.name,
                      ownerId: folder.ownerId,
                      folderId: folder.parentId,
                      spaceId: null,
                      spaceFolderId: null,
                      createdAt: folder.createdAt,
                      updatedAt: folder.updatedAt
                    })
                  }}
                  className="gba:p-1 gba:rounded gba:hover:bg-destructive-secondary gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
                  data-testid={`${testId}-trash-folder-${folder.id}`}
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {items.map(item => {
        const { Icon, color } = resolveIconAndColor(item)
        const key = `${item.type}:${item.id}`
        return (
          <div
            key={key}
            onClick={e => sel(key, e)}
            onDoubleClick={() => onItemClick(item)}
            draggable={!isTrash}
            onDragStart={e => startDrag(e, item.type, item.id)}
            className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:rounded-lg gba:hover:bg-accent/50 gba:transition-colors gba:group gba:cursor-pointer ${isSelected(key) ? selectedCls : ''}`}
            data-testid={`${testId}-item-${item.id}`}
          >
            <Icon className={`gba:w-5 gba:h-5 ${color} gba:flex-shrink-0`} />
            <span className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1.5">
              <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{item.name}</span>
              {item.externalSource && (
                <Badge variant="info" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:gap-0.5 gba:shrink-0">
                  <CloudDownload className="gba:w-2 gba:h-2" />
                  {t('badge-imported')}
                </Badge>
              )}
              {item.isShared && (
                <Badge variant="secondary" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:gap-0.5 gba:shrink-0">
                  <Users className="gba:w-2 gba:h-2" />
                  {t('shared-folder-badge')}
                </Badge>
              )}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right gba:hidden gba:sm:block">
              {localizeFileTypeLabel(getFileTypeLabel(item.type, item.mimeType, item.name), t)}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-20 gba:text-right gba:hidden gba:md:block">
              {formatFileSize(item.fileSize)}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right">
              {formatDate(item.updatedAt, t, locale)}
            </span>
            <DriveListItemActions
              item={item}
              isTrash={isTrash}
              onToggleFavorite={onToggleFavorite}
              onTrashItem={onTrashItem}
              onRestoreItem={onRestoreItem}
              onDownloadItem={onDownloadItem}
              onRenameItem={onRenameItem}
              onShareItem={onShareItem}
              onAddToMyDrive={onAddToMyDrive}
              onRemoveShortcut={onRemoveShortcut}
              t={t}
              testId={testId}
            />
          </div>
        )
      })}
    </div>
  )
}
