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
  Link2,
  Copy,
  Trash2,
  Folder,
  ChevronRight,
  Edit3
} from 'lucide-react'
import { NoteContentHeader } from './NoteContentHeader'
import { NotePreviewCard } from './NotePreviewCard'
import { NoteBulkActions } from './NoteBulkActions'
import type { NoteSummary, NoteTreeNode } from '../types'
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
  onViewLayoutChange: (layout: 'grid' | 'list') => void
  onSortByChange: (sortBy: 'name' | 'modified' | 'created') => void
  onSortOrderToggle: () => void
  onBreadcrumbClick: (id: string | null) => void
  onToggleSidebar: () => void
  onCreateNote: (opts?: { noteType?: 'text' | 'handwriting' }) => void
  onCreateFolder?: () => void
  onRefresh: () => void
  onOpenNote: (id: string) => void
  onOpenFolder?: (id: string) => void
  onDeleteNote: (id: string) => void
  onDuplicateNote: (id: string) => void
  onTogglePin: (id: string) => void
  onArchiveNote: (id: string) => void
  onShareNote: (id: string) => void
  onCopyLink: (note: NoteSummary) => void
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void
  onToggleSelect: (id: string, e?: React.MouseEvent) => void
  onSelectAll: () => void
  onBulkDelete?: () => void
  onBulkPin?: () => void
  onBulkArchive?: () => void
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
  onViewLayoutChange,
  onSortByChange,
  onSortOrderToggle,
  onBreadcrumbClick,
  onToggleSidebar,
  onCreateNote,
  onCreateFolder,
  onRefresh,
  onOpenNote,
  onOpenFolder,
  onDeleteNote,
  onDuplicateNote,
  onTogglePin,
  onArchiveNote,
  onShareNote,
  onCopyLink,
  onToggleFavorite,
  onToggleSelect,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectAll: _onSelectAll,
  onBulkDelete,
  onBulkPin,
  onBulkArchive,
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

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:bg-background">
      <NoteContentHeader
        breadcrumbs={breadcrumbs}
        currentTitle={currentTitle}
        viewLayout={viewLayout}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isSidebarCollapsed={isSidebarCollapsed}
        onViewLayoutChange={onViewLayoutChange}
        onSortByChange={onSortByChange}
        onSortOrderToggle={onSortOrderToggle}
        onBreadcrumbClick={onBreadcrumbClick}
        onToggleSidebar={onToggleSidebar}
        onCreateNote={onCreateNote}
        onCreateFolder={onCreateFolder}
        onRefresh={onRefresh}
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
                  ? t('empty-shared-title')
                  : activeSection === 'archived'
                    ? t('empty-archived-title')
                    : t('empty-default-title')}
            </h3>
            <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:max-w-sm gba:mb-5">
              {activeSection === 'pinned'
                ? t('empty-pinned-description')
                : activeSection === 'shared'
                  ? t('empty-shared-description')
                  : activeSection === 'archived'
                    ? t('empty-archived-description')
                    : t('empty-default-description')}
            </p>
            {activeSection !== 'pinned' && activeSection !== 'shared' && activeSection !== 'archived' && (
              <Button onClick={() => onCreateNote()} size="sm">
                <Plus className="gba:w-4 gba:h-4 gba:mr-1.5" />
                {t('empty-create-note')}
              </Button>
            )}
          </div>
        )}

        {/* Grid view */}
        {!isLoading && notes.length > 0 && viewLayout === 'grid' && (
          <div className="gba:p-5 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
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
                onArchive={onArchiveNote}
                onShare={onShareNote}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && notes.length > 0 && viewLayout === 'list' && (
          <div className="gba:w-full gba:px-4 gba:py-2">
            <div className="gba:space-y-px">
              {notes.map((note, idx) => {
                const prevNote = idx > 0 ? notes[idx - 1] : null
                const prevIsFolder = prevNote
                  ? prevNote.icon === '📁' || (prevNote.hasChildren && !prevNote.preview)
                  : false
                const isOwner = note.ownerId === currentUserId || note.permission === 'owner'
                const isSelected = selectedNotes.has(note.id)
                const isFavorite = favorites.has(note.id)
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

                const showFolderDivider = prevIsFolder && !isNoteFolder

                return (
                  <React.Fragment key={note.id}>
                    {showFolderDivider && <div className="gba:h-2" />}
                    <div
                      className={`gba:group gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl gba:transition-all gba:duration-150 gba:cursor-pointer ${
                        isSelected
                          ? 'gba:bg-primary/8 gba:ring-1 gba:ring-primary/20'
                          : dragOverFolderId === note.id
                            ? 'gba:bg-primary/12 gba:ring-2 gba:ring-primary/40 gba:scale-[1.01]'
                            : 'hover:gba:bg-muted/40'
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
                      <div
                        className={`gba:flex-shrink-0 gba:transition-opacity ${isSelected ? 'gba:opacity-100' : 'gba:opacity-30 group-hover:gba:opacity-100'}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(note.id)} />
                      </div>

                      {/* Favorite */}
                      {!isNoteFolder && (
                        <button
                          onClick={e => onToggleFavorite(note.id, e)}
                          className={`gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:transition-colors ${
                            isFavorite
                              ? 'gba:text-warning'
                              : 'gba:text-muted-foreground/30 hover:gba:text-muted-foreground'
                          }`}
                        >
                          <Star className={`gba:w-3.5 gba:h-3.5 ${isFavorite ? 'gba:fill-current' : ''}`} />
                        </button>
                      )}

                      {/* Icon */}
                      <div
                        className={`gba:w-9 gba:h-9 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
                          isNoteFolder
                            ? 'gba:bg-primary/8'
                            : 'gba:bg-gradient-to-br gba:from-primary/10 gba:to-primary/5'
                        }`}
                      >
                        {isNoteFolder ? (
                          <Folder className="gba:w-4 gba:h-4 gba:text-primary" />
                        ) : isHandwriting ? (
                          <PenTool className="gba:w-4 gba:h-4 gba:text-primary/70" />
                        ) : (
                          <FileText className="gba:w-4 gba:h-4 gba:text-primary/70" />
                        )}
                      </div>

                      {/* Title + preview */}
                      <div className="gba:flex-1 gba:min-w-0">
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
                              className="gba:text-[13px] gba:font-medium gba:text-foreground gba:bg-transparent gba:border gba:border-primary/30 gba:rounded gba:px-1.5 gba:py-0.5 gba:outline-none focus:gba:ring-1 focus:gba:ring-primary/40 gba:w-full gba:max-w-[200px]"
                            />
                          ) : (
                            <span className="gba:text-[13px] gba:font-medium gba:text-foreground gba:truncate">
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
                          <p className="gba:text-xs gba:text-muted-foreground/60 gba:truncate gba:mt-0.5">
                            {note.preview}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <div className="gba:flex-shrink-0 gba:text-[11px] gba:text-muted-foreground/50 gba:tabular-nums gba:hidden gba:sm:block">
                        {formatRelativeTime(note.updatedAt, t)}
                      </div>

                      {/* Owner */}
                      <div className="gba:flex-shrink-0 gba:hidden gba:md:flex gba:items-center gba:gap-1.5 gba:w-28">
                        <Avatar className="gba:w-5 gba:h-5">
                          {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                          <AvatarFallback className="gba:text-[8px] gba:bg-muted">
                            {ownerInfo?.name ? getInitials(ownerInfo.name) : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:truncate">
                          {isOwner ? t('owner-you') : ownerInfo?.name || t('owner-unknown')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="gba:flex-shrink-0 gba:opacity-30 group-hover:gba:opacity-100 gba:transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7 gba:text-muted-foreground">
                              <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="gba:w-44">
                            <DropdownMenuItem
                              onClick={() =>
                                isNoteFolder && onOpenFolder ? onOpenFolder(note.id) : onOpenNote(note.id)
                              }
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
                            {!isNoteFolder && isOwner && (
                              <DropdownMenuItem onClick={() => onShareNote(note.id)}>
                                <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                {t('menu-share')}
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
                            <DropdownMenuItem className="gba:text-destructive" onClick={() => onDeleteNote(note.id)}>
                              <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('menu-delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {isNoteFolder && (
                        <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/40 gba:flex-shrink-0" />
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        {/* Bulk Actions floating bar */}
        <NoteBulkActions
          selectedCount={selectedNotes.size}
          onDelete={onBulkDelete || (() => {})}
          onPin={onBulkPin}
          onArchive={onBulkArchive}
          onClearSelection={onClearSelection || (() => {})}
        />
      </div>
    </div>
  )
}
