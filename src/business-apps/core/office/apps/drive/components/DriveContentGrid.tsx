import React, { useState } from 'react'
import {
  FileText,
  StickyNote,
  Table2,
  Presentation,
  File,
  Folder,
  Trash2,
  Share2,
  Users,
  ExternalLink
} from 'lucide-react'
import type { DriveItem, DriveFolder, DriveViewMode, DriveSection } from '../types/drive.types'
import { getItemLabel, formatFileSize } from '../types/drive.types'
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
  onShareItem?: (item: DriveItem) => void
  onShareFolder?: (folder: DriveFolder) => void
  selectedKeys?: Set<string>
  onSelect?: (key: string, modifiers: SelectModifiers) => void
  onSelectOnly?: (key: string) => void
  onMoveToFolder?: (targetFolderId: string, refs: Array<{ entityType: string; entityId: string }>) => void
  onAddToMyDrive?: (entityType: string, entityId: string) => void
  onRemoveShortcut?: (shortcutId: string) => void
  t: (key: string) => string
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString()
}

const SharedBadge: React.FC = () => (
  <span className="gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:w-3 gba:h-3 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
    <Users className="gba:w-2 gba:h-2 gba:text-primary-foreground" />
  </span>
)

const ShortcutBadge: React.FC = () => (
  <span className="gba:absolute gba:-bottom-0.5 gba:-left-0.5 gba:w-3 gba:h-3 gba:rounded-full gba:bg-accent gba:flex gba:items-center gba:justify-center">
    <ExternalLink className="gba:w-2 gba:h-2 gba:text-accent-foreground" />
  </span>
)

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
  onShareItem,
  onShareFolder,
  selectedKeys,
  onSelect,
  onSelectOnly,
  onMoveToFolder,
  onAddToMyDrive,
  onRemoveShortcut,
  t,
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
              Folders
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
                    <span className="gba:relative gba:flex-shrink-0">
                      <Folder className="gba:w-8 gba:h-8 gba:text-primary" />
                      {folder.isShared && <SharedBadge />}
                    </span>
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{folder.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {items.length > 0 && (
          <div>
            <h3 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-3">
              Files
            </h3>
            <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-5 gba:gap-3">
              {items.map(item => {
                const Icon = TYPE_ICONS[item.type] ?? File
                const color = TYPE_COLORS[item.type] ?? 'gba:text-muted-foreground'
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
                    <span className="gba:relative">
                      <Icon className={`gba:w-10 gba:h-10 ${color}`} />
                      {item.isShared && <SharedBadge />}
                      {item.isShortcut && <ShortcutBadge />}
                    </span>
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:w-full">
                      {item.name}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground">{getItemLabel(item.type)}</span>
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
            <span className="gba:relative gba:flex-shrink-0">
              <Folder className="gba:w-5 gba:h-5 gba:text-primary" />
              {folder.isShared && <SharedBadge />}
            </span>
            <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
              {folder.name}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right gba:hidden gba:sm:block">
              Folder
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-20 gba:text-right gba:hidden gba:md:block">
              &mdash;
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right">
              {formatDate(folder.updatedAt)}
            </span>
            <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end gba:w-36">
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
        const Icon = TYPE_ICONS[item.type] ?? File
        const color = TYPE_COLORS[item.type] ?? 'gba:text-muted-foreground'
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
            <span className="gba:relative gba:flex-shrink-0">
              <Icon className={`gba:w-5 gba:h-5 ${color}`} />
              {item.isShared && <SharedBadge />}
              {item.isShortcut && <ShortcutBadge />}
            </span>
            <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{item.name}</span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right gba:hidden gba:sm:block">
              {getItemLabel(item.type)}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-20 gba:text-right gba:hidden gba:md:block">
              {formatFileSize(item.fileSize)}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground gba:w-24 gba:text-right">
              {formatDate(item.updatedAt)}
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
