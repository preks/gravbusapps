/**
 * NotePreviewCard Component
 *
 * Card component for displaying note preview in grid/list views.
 * Shows title, preview, tags, and quick actions.
 */

import React from 'react'
import {
  Card,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { MoreHorizontal, Pin, PinOff, Copy, Trash2, Share2, FolderInput, Users, FileText, Folder } from 'lucide-react'
import type { NoteSummary, NoteColor } from '../types'
import translations from '../_i18n'

export interface SharedUserInfo {
  userId: string
  userName: string
  userAvatar?: string
  permission?: string
}

export interface NotePreviewCardProps {
  note: NoteSummary
  currentUserId: string
  sharedUsers?: SharedUserInfo[]
  sharedByUser?: SharedUserInfo
  onOpen: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  onTogglePin?: (id: string) => void
  onShare?: (id: string) => void
  onManageShares?: (id: string) => void
  onMove?: (id: string) => void
  'data-testid'?: string
}

// Note color mapping to design tokens
const colorMap: Record<NoteColor, string> = {
  default: 'gba:bg-card',
  red: 'gba:bg-destructive-secondary/30',
  orange: 'gba:bg-warning-secondary/30',
  yellow: 'gba:bg-warning-secondary/20',
  green: 'gba:bg-success-secondary/30',
  teal: 'gba:bg-success-secondary/20',
  blue: 'gba:bg-info-secondary/30',
  purple: 'gba:bg-primary/10',
  pink: 'gba:bg-destructive-secondary/20',
  gray: 'gba:bg-muted/50'
}

const borderColorMap: Record<NoteColor, string> = {
  default: 'gba:border-border',
  red: 'gba:border-destructive/30',
  orange: 'gba:border-warning/30',
  yellow: 'gba:border-warning/20',
  green: 'gba:border-success/30',
  teal: 'gba:border-success/20',
  blue: 'gba:border-info/30',
  purple: 'gba:border-primary/30',
  pink: 'gba:border-destructive/20',
  gray: 'gba:border-muted-foreground/20'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRelativeTime(dateString: string, t: (key: string, vars?: Record<string, unknown>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('time-just-now')
  if (diffMinutes < 60) return t('time-minutes-ago', { count: diffMinutes })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString()
}

export const NotePreviewCard: React.FC<NotePreviewCardProps> = ({
  note,
  currentUserId,
  sharedUsers = [],
  sharedByUser,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onTogglePin,
  onShare,
  onManageShares,
  onMove,
  'data-testid': testId = 'note-preview-card'
}) => {
  const { t } = useTranslation(translations)
  const isOwner = note.ownerId === currentUserId || note.permission === 'owner'
  const canEdit = isOwner || note.permission === 'edit' || note.permission === 'admin'
  const noteColor = note.color || 'default'
  const hasSharedUsers = sharedUsers.length > 0
  const isSharedWithMe = note.isShared && !isOwner

  const handleClick = () => {
    onOpen(note.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(note.id)
    }
  }

  return (
    <Card
      className={`gba:relative gba:overflow-hidden gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:shadow-md hover:gba:-translate-y-0.5 active:gba:scale-[0.98] gba:group gba:border ${colorMap[noteColor]} ${borderColorMap[noteColor]}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open note: ${note.title || t('title-untitled')}`}
      data-testid={testId}
    >
      {/* Pin indicator */}
      {note.isPinned && (
        <div className="gba:absolute gba:top-2.5 gba:right-2.5 gba:text-warning">
          <Pin className="gba:w-3.5 gba:h-3.5 gba:fill-current" />
        </div>
      )}

      <div className="gba:p-4">
        {/* Icon and Title */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-3">
          <div className="gba:flex-shrink-0 gba:w-10 gba:h-10 gba:rounded-xl gba:bg-card-decorative gba:flex gba:items-center gba:justify-center">
            {note.icon === '📁' ? (
              <Folder className="gba:w-5 gba:h-5 gba:text-decorative-foreground" />
            ) : note.hasChildren ? (
              <Folder className="gba:w-5 gba:h-5 gba:text-decorative-foreground" />
            ) : (
              <FileText className="gba:w-5 gba:h-5 gba:text-decorative-foreground" />
            )}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:font-semibold gba:text-foreground gba:truncate gba:pr-6">
              {note.title || t('title-untitled')}
            </h3>
            <p className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(note.updatedAt, t)}</p>
          </div>
        </div>

        {/* Preview */}
        {note.preview && (
          <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:mb-3">{note.preview}</p>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mb-3">
            {note.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="gba:text-xs">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <Badge variant="outline" className="gba:text-xs">
                +{note.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t gba:border-border/50">
          {/* Shared users or shared by info */}
          <div className="gba:flex gba:items-center gba:gap-2">
            {isSharedWithMe && sharedByUser && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <Avatar className="gba:w-5 gba:h-5">
                        <AvatarImage src={sharedByUser.userAvatar} alt={sharedByUser.userName} />
                        <AvatarFallback className="gba:text-[8px] gba:bg-primary/10">
                          {getInitials(sharedByUser.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {t('preview-shared-by', { name: sharedByUser.userName })}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('preview-shared-by', { name: sharedByUser.userName })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {isOwner && hasSharedUsers && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <div className="gba:flex gba:-space-x-1">
                        {sharedUsers.slice(0, 3).map(user => (
                          <Avatar key={user.userId} className="gba:w-5 gba:h-5 gba:border gba:border-background">
                            <AvatarImage src={user.userAvatar} alt={user.userName} />
                            <AvatarFallback className="gba:text-[8px] gba:bg-primary/10">
                              {getInitials(user.userName)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {sharedUsers.length > 3 && (
                        <span className="gba:text-xs gba:text-muted-foreground">+{sharedUsers.length - 3}</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('shared-with-count', { count: sharedUsers.length })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!isSharedWithMe && !hasSharedUsers && note.hasChildren && (
              <span className="gba:text-xs gba:text-muted-foreground">
                {t('preview-notes-count', { count: note.childCount })}
              </span>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7">
                <MoreHorizontal className="gba:w-4 gba:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(note.id)}>
                  <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-menu-edit')}
                </DropdownMenuItem>
              )}

              {onTogglePin && (
                <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
                  {note.isPinned ? (
                    <>
                      <PinOff className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('menu-unpin')}
                    </>
                  ) : (
                    <>
                      <Pin className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('menu-pin')}
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(note.id)}>
                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('menu-duplicate')}
                </DropdownMenuItem>
              )}

              {onMove && (
                <DropdownMenuItem onClick={() => onMove(note.id)}>
                  <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-menu-move-to')}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {isOwner && onShare && (
                <DropdownMenuItem onClick={() => onShare(note.id)}>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('menu-share')}
                </DropdownMenuItem>
              )}

              {isOwner && hasSharedUsers && onManageShares && (
                <DropdownMenuItem onClick={() => onManageShares(note.id)}>
                  <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-menu-manage-shares')}
                </DropdownMenuItem>
              )}

              {isOwner && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(note.id)}
                    className="gba:text-destructive focus:gba:text-destructive"
                  >
                    <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('menu-delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state component for no notes
 */
export const NoNotesState: React.FC<{
  onCreateNew: () => void
  title?: string
  description?: string
}> = ({ onCreateNew, title, description }) => {
  const { t } = useTranslation(translations)
  const resolvedTitle = title ?? t('empty-default-title')
  const resolvedDesc = description ?? t('empty-default-description')
  return (
    <Card className="gba:p-12 gba:text-center">
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
        <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-card-decorative gba:flex gba:items-center gba:justify-center">
          <FileText className="gba:w-10 gba:h-10 gba:text-decorative-foreground" />
        </div>
        <div className="gba:space-y-2">
          <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">{resolvedTitle}</h3>
          <p className="gba:text-muted-foreground gba:max-w-md">{resolvedDesc}</p>
        </div>
        <Button onClick={onCreateNew} className="gba:mt-4">
          {t('empty-create-note')}
        </Button>
      </div>
    </Card>
  )
}

export default NotePreviewCard
