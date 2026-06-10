import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Button,
  Card,
  Spinner,
  Checkbox,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  StickyNote,
  Plus,
  Pin,
  Star,
  MoreHorizontal,
  FileText,
  PenTool,
  Share2,
  Users,
  Link2,
  Copy,
  Trash2,
  Folder,
  ArrowUpDown,
  Edit3
} from 'lucide-react'
import { NoteContentHeader } from './NoteContentHeader'
import { NotePreviewCard } from './NotePreviewCard'
import type { NoteSummary, NoteTreeNode } from '../types'
import { getShareCapabilities } from '@/business-apps/core/office/sharing'
import translations from '../_i18n'

export interface NoteContentAreaProps {
  notes: NoteSummary[]
  breadcrumbs: NoteTreeNode[]
  currentTitle?: string
  viewLayout: 'grid' | 'list'
  sortBy: 'name' | 'modified' | 'created'
  sortOrder: 'asc' | 'desc'
  isLoading: boolean
  error: string | null
  isSidebarCollapsed: boolean
  currentUserId: string
  selectedNotes: Set<string>
  favorites: Set<string>
  ownerInfoMap: Map<string, { name: string; avatar?: string }>
  activeSection: string
  searchQuery: string
  onSearchChange: (query: string) => void
  onViewLayoutChange: (layout: 'grid' | 'list') => void
  onSortByChange: (sortBy: 'name' | 'modified' | 'created') => void
  onSortOrderToggle: () => void
  onBreadcrumbClick: (id: string | null) => void
  onToggleSidebar: () => void
  onCreateNote: (opts?: { noteType?: 'text' | 'handwriting' }) => void
  onRefresh: () => void
  onOpenNote: (id: string) => void
  onOpenFolder?: (id: string) => void
  onDeleteNote: (id: string) => void
  onDuplicateNote: (id: string) => void
  onTogglePin: (id: string) => void
  onShareNote: (id: string) => void
  onManageShares?: (id: string) => void
  hasSharesForNote: (noteId: string) => boolean
  onCopyLink: (note: NoteSummary) => void
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void
  onToggleSelect: (id: string, e?: React.MouseEvent) => void
  onSelectAll: () => void
  onBulkDelete?: () => void
  onBulkPin?: () => void
  onClearSelection?: () => void
  onMoveToFolder?: (noteId: string, folderId: string) => void
  onRenameNote?: (noteId: string, newTitle: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRelativeTime(dateString: string, t: (key: string, vars?: Record<string, unknown>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString()
}

export const NoteContentArea: React.FC<NoteContentAreaProps> = ({
  notes,
  breadcrumbs,
  currentTitle,
  viewLayout,
  sortBy,
  sortOrder,
  isLoading,
  error,
  isSidebarCollapsed,
  currentUserId,
  selectedNotes,
  favorites,
  ownerInfoMap,
  activeSection,
  searchQuery,
  onSearchChange,
  onViewLayoutChange,
  onSortByChange,
  onSortOrderToggle,
  onBreadcrumbClick,
  onToggleSidebar,
  onCreateNote,
  onRefresh,
  onOpenNote,
  onOpenFolder,
  onDeleteNote,
  onDuplicateNote,
  onTogglePin,
  onShareNote,
  onManageShares,
  hasSharesForNote,
  onCopyLink,
  onToggleFavorite,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
  onBulkPin,
  onClearSelection,
  onMoveToFolder,
  onRenameNote
}) => {
  const { t } = useTranslation(translations)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const startRename = useCallback((noteId: string, currentTitle: string) => {
    setRenamingId(noteId)
    setRenameValue(currentTitle)
  }, [])

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim() && onRenameNote) {
      onRenameNote(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }, [renamingId, renameValue, onRenameNote])

  const handleSortColumn = useCallback(
    (column: 'name' | 'modified' | 'created') => {
      if (sortBy === column) {
        onSortOrderToggle()
      } else {
        onSortByChange(column)
      }
    },
    [sortBy, onSortByChange, onSortOrderToggle]
  )

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:bg-background">
      <NoteContentHeader
        breadcrumbs={breadcrumbs}
        currentTitle={currentTitle}
        viewLayout={viewLayout}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isSidebarCollapsed={isSidebarCollapsed}
        searchQuery={searchQuery}
        selectedCount={selectedNotes.size}
        onSearchChange={onSearchChange}
        onViewLayoutChange={onViewLayoutChange}
        onSortByChange={onSortByChange}
        onSortOrderToggle={onSortOrderToggle}
        onBreadcrumbClick={onBreadcrumbClick}
        onToggleSidebar={onToggleSidebar}
        onRefresh={onRefresh}
        onBulkDelete={onBulkDelete}
        onBulkPin={onBulkPin}
        onClearSelection={onClearSelection || (() => {})}
      />

      <div className="gba:flex-1 gba:overflow-auto">
        {isLoading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="gba:p-6">
            <Card className="gba:p-6 gba:text-center">
              <p className="gba:text-destructive">{error}</p>
            </Card>
          </div>
        )}

        {!isLoading && !error && notes.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
            <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-gradient-to-br gba:from-warning/20 gba:to-warning/5 gba:flex gba:items-center gba:justify-center gba:mb-5">
              <StickyNote className="gba:w-10 gba:h-10 gba:text-warning" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1.5">
              {activeSection === 'pinned'
                ? t('empty-pinned-title')
                : activeSection === 'shared'
                  ? t('notes-empty-shared-title')
                  : activeSection === 'trash'
                    ? t('notes-empty-trash-title')
                    : t('notes-empty-default-title')}
            </h3>
            <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:max-w-sm gba:mb-5">
              {activeSection === 'pinned'
                ? t('empty-pinned-description')
                : activeSection === 'shared'
                  ? t('notes-empty-shared-description')
                  : activeSection === 'trash'
                    ? t('notes-empty-trash-description')
                    : t('notes-empty-default-description')}
            </p>
            {activeSection !== 'pinned' && activeSection !== 'shared' && activeSection !== 'trash' && (
              <Button onClick={() => onCreateNote()} size="sm">
                <Plus className="gba:w-4 gba:h-4 gba:mr-1.5" />
                {t('empty-create-note')}
              </Button>
            )}
          </div>
        )}

        {/* Grid view */}
        {!isLoading && notes.length > 0 && viewLayout === 'grid' && (
          <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:py-5 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
            {notes.map(note => (
              <NotePreviewCard
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onOpen={onOpenNote}
                onEdit={onOpenNote}
                onDelete={onDeleteNote}
                onDuplicate={onDuplicateNote}
                onTogglePin={onTogglePin}
                onShare={onShareNote}
                onManageShares={onManageShares}
                hasSharesForNote={hasSharesForNote(note.id)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && notes.length > 0 && viewLayout === 'list' && (
          <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
            {/* Table header */}
            <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
              <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                <div className="gba:w-8 gba:flex-shrink-0">
                  <Checkbox
                    checked={selectedNotes.size === notes.length && notes.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </div>
                <div className="gba:w-8 gba:flex-shrink-0" />
                <button
                  type="button"
                  className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-1 gba:text-left hover:gba:text-foreground"
                  onClick={() => handleSortColumn('name')}
                >
                  {t('sort-name')}
                  {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                </button>
                <button
                  type="button"
                  className="gba:w-36 gba:flex-shrink-0 gba:hidden gba:sm:flex gba:items-center gba:gap-1 gba:text-left hover:gba:text-foreground"
                  onClick={() => handleSortColumn('modified')}
                >
                  {t('sort-modified')}
                  {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                </button>
                <div className="gba:w-40 gba:flex-shrink-0 gba:hidden gba:md:block">{t('table-owner')}</div>
                <button
                  type="button"
                  className="gba:w-32 gba:flex-shrink-0 gba:hidden gba:lg:flex gba:items-center gba:gap-1 gba:text-left hover:gba:text-foreground"
                  onClick={() => handleSortColumn('created')}
                >
                  {t('sort-created')}
                  {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                </button>
                <div className="gba:w-10 gba:flex-shrink-0" />
              </div>
            </div>

            {/* Table body */}
            <div className="gba:divide-y gba:divide-border">
              {notes.map(note => {
                const isOwner = note.ownerId === currentUserId || note.permission === 'owner'
                const capabilities = getShareCapabilities({ permission: note.permission, isOwner })
                const isSelected = selectedNotes.has(note.id)
                const isFavorite = note.isFavorite ?? favorites.has(note.id)
                const ownerInfo = note.ownerId ? ownerInfoMap.get(note.ownerId) : undefined
                const isHandwriting =
                  note.noteType === 'handwriting' ||
                  (note.contentJson as { _noteType?: string } | undefined)?._noteType === 'handwriting'
                const isNoteFolder = note.icon === '📁' || (note.hasChildren && !note.preview)

                const handleRowClick = () => {
                  if (isNoteFolder && onOpenFolder) {
                    onOpenFolder(note.id)
                  } else {
                    onOpenNote(note.id)
                  }
                }

                return (
                  <div
                    key={note.id}
                    className={`gba:group gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer ${
                      isSelected
                        ? 'gba:bg-primary/5'
                        : dragOverFolderId === note.id
                          ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/30'
                          : 'hover:gba:bg-muted/30'
                    }`}
                    draggable={!isNoteFolder}
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', note.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={e => {
                      if (isNoteFolder) {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverFolderId(note.id)
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverFolderId === note.id) setDragOverFolderId(null)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOverFolderId(null)
                      const draggedId = e.dataTransfer.getData('text/plain')
                      if (draggedId && draggedId !== note.id && isNoteFolder && onMoveToFolder)
                        onMoveToFolder(draggedId, note.id)
                    }}
                    onClick={handleRowClick}
                    data-testid={`list-row-${note.id}`}
                  >
                    {/* Checkbox */}
                    <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(note.id)} />
                    </div>

                    {/* Favorite */}
                    <div className="gba:w-8 gba:flex-shrink-0">
                      {!isNoteFolder && (
                        <button
                          onClick={e => onToggleFavorite(note.id, e)}
                          className={`gba:p-1 gba:rounded hover:gba:bg-muted ${
                            isFavorite ? 'gba:text-warning' : 'gba:text-muted-foreground/40 hover:gba:text-foreground'
                          }`}
                        >
                          <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Name & icon */}
                    <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-3">
                      <div className="gba:w-9 gba:h-9 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-card-decorative">
                        {isNoteFolder ? (
                          <Folder className="gba:w-4 gba:h-4 gba:text-decorative-foreground" />
                        ) : isHandwriting ? (
                          <PenTool className="gba:w-4 gba:h-4 gba:text-decorative-foreground" />
                        ) : (
                          <FileText className="gba:w-4 gba:h-4 gba:text-decorative-foreground" />
                        )}
                      </div>
                      <div className="gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-1.5">
                          {renamingId === note.id ? (
                            <input
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitRename()
                                if (e.key === 'Escape') setRenamingId(null)
                              }}
                              onClick={e => e.stopPropagation()}
                              className="gba:text-sm gba:font-medium gba:text-foreground gba:bg-transparent gba:border gba:border-primary/30 gba:rounded gba:px-1.5 gba:py-0.5 gba:outline-none focus:gba:ring-1 focus:gba:ring-primary/40 gba:w-full gba:max-w-[200px]"
                            />
                          ) : (
                            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                              {note.title || t('title-untitled')}
                            </span>
                          )}
                          {isNoteFolder && note.childCount !== undefined && note.childCount > 0 && (
                            <span className="gba:text-[11px] gba:text-muted-foreground/50">{note.childCount}</span>
                          )}
                          {note.isPinned && (
                            <Pin className="gba:w-3 gba:h-3 gba:text-primary gba:fill-current gba:flex-shrink-0" />
                          )}
                          {note.isShared && !isOwner && (
                            <Badge
                              variant="outline"
                              className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:border-muted-foreground/20"
                            >
                              {t('label-shared')}
                            </Badge>
                          )}
                        </div>
                        {note.preview && (
                          <p className="gba:text-xs gba:text-muted-foreground/60 gba:truncate">{note.preview}</p>
                        )}
                      </div>
                    </div>

                    {/* Modified */}
                    <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground gba:hidden gba:sm:block">
                      {formatRelativeTime(note.updatedAt, t)}
                    </div>

                    {/* Owner */}
                    <div className="gba:w-40 gba:flex-shrink-0 gba:hidden gba:md:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:w-6 gba:h-6">
                        {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                        <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                          {ownerInfo?.name ? getInitials(ownerInfo.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                        {isOwner ? t('owner-you') : ownerInfo?.name || t('owner-unknown')}
                      </span>
                    </div>

                    {/* Created */}
                    <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground gba:hidden gba:lg:block">
                      {formatRelativeTime(note.createdAt, t)}
                    </div>

                    {/* Actions */}
                    <div
                      className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-end"
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8 gba:text-muted-foreground">
                            <MoreHorizontal className="gba:w-4 gba:h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="gba:w-44">
                          <DropdownMenuItem
                            onClick={() => (isNoteFolder && onOpenFolder ? onOpenFolder(note.id) : onOpenNote(note.id))}
                          >
                            {isNoteFolder ? (
                              <Folder className="gba:w-4 gba:h-4 gba:mr-2" />
                            ) : (
                              <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                            )}
                            {t('menu-open')}
                          </DropdownMenuItem>
                          {onRenameNote && (
                            <DropdownMenuItem onClick={() => startRename(note.id, note.title || '')}>
                              <Edit3 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-rename')}
                            </DropdownMenuItem>
                          )}
                          {!isNoteFolder && capabilities.canManageSharing && (
                            <DropdownMenuItem onClick={() => onShareNote(note.id)}>
                              <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-share')}
                            </DropdownMenuItem>
                          )}
                          {!isNoteFolder &&
                            capabilities.canManageSharing &&
                            onManageShares &&
                            hasSharesForNote(note.id) && (
                              <DropdownMenuItem onClick={() => onManageShares(note.id)}>
                                <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                {t('menu-manage-sharing')}
                              </DropdownMenuItem>
                            )}
                          {!isNoteFolder && (
                            <DropdownMenuItem onClick={() => onCopyLink(note)}>
                              <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-copy-link')}
                            </DropdownMenuItem>
                          )}
                          {!isNoteFolder && (
                            <DropdownMenuItem onClick={() => onDuplicateNote(note.id)}>
                              <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-duplicate')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!isNoteFolder && (
                            <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
                              <Pin
                                className={`gba:w-4 gba:h-4 gba:mr-2 ${note.isPinned ? 'gba:fill-current gba:text-primary' : ''}`}
                              />
                              {note.isPinned ? t('menu-unpin') : t('menu-pin')}
                            </DropdownMenuItem>
                          )}
                          {!isNoteFolder && (
                            <DropdownMenuItem onClick={() => onToggleFavorite(note.id)}>
                              <Star
                                className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-warning' : ''}`}
                              />
                              {isFavorite ? t('menu-remove-favorite') : t('menu-add-favorite')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {capabilities.canDelete && (
                            <DropdownMenuItem className="gba:text-destructive" onClick={() => onDeleteNote(note.id)}>
                              <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
