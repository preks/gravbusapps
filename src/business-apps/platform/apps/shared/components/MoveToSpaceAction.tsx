/**
 * MoveToSpaceDialog - Dialog for moving content to spaces
 *
 * Following the same pattern as other dialogs in the hubs (ShareDocumentDialog, etc.)
 * The dialog state should be managed by the parent component.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  useTranslation,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenuItem,
  Button,
  Input
} from '@newwork/nw-design-system'
import { FolderInput, Search, Loader2, Lock, Globe } from 'lucide-react'
import { toast } from 'sonner'
import sharedTranslations from '../_i18n'
import { getDocumentServiceApiUrl } from '../utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

interface Space {
  id: string
  name: string
  description?: string
  color?: string
  isPublic: boolean
}

// Color schemes for space display
const colorSchemes: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'gba:bg-sky-500/20', text: 'gba:text-sky-600' },
  purple: { bg: 'gba:bg-fuchsia-500/20', text: 'gba:text-fuchsia-600' },
  green: { bg: 'gba:bg-emerald-500/20', text: 'gba:text-emerald-600' },
  orange: { bg: 'gba:bg-orange-500/20', text: 'gba:text-orange-600' },
  pink: { bg: 'gba:bg-pink-500/20', text: 'gba:text-pink-600' },
  cyan: { bg: 'gba:bg-cyan-500/20', text: 'gba:text-cyan-600' }
}

const getColorScheme = (color?: string) => colorSchemes[color || 'blue'] || colorSchemes.blue
const getMonogram = (name: string) => name.charAt(0).toUpperCase()

/**
 * MoveToSpaceMenuItem - Just the menu item, no dialog
 * Use this inside DropdownMenuContent
 */
export interface MoveToSpaceMenuItemProps {
  onClick: () => void
  label?: string
  'data-testid'?: string
}

export const MoveToSpaceMenuItem: React.FC<MoveToSpaceMenuItemProps> = ({
  onClick,
  label,
  'data-testid': testId = 'move-to-space-menu-item'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const resolvedLabel = label ?? t('move-to-space-menu-label')
  return (
    <DropdownMenuItem onClick={onClick} data-testid={testId}>
      <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
      {resolvedLabel}
    </DropdownMenuItem>
  )
}

/**
 * MoveToSpaceDialog - The dialog component
 * Render this at the parent level, outside any dropdown
 */
export interface MoveToSpaceDialogMessages {
  title?: string
  descriptionWithName?: string
  descriptionGeneric?: string
  searchPlaceholder?: string
  noMatching?: string
  noSpaces?: string
  createFirst?: string
  footerHint?: string
  cancel?: string
  move?: string
}

export interface MoveToSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: 'document' | 'note' | 'spreadsheet'
  contentId: string
  contentName?: string
  accessToken?: string
  onMoved?: () => void
  messages?: MoveToSpaceDialogMessages
  'data-testid'?: string
}

export const MoveToSpaceDialog: React.FC<MoveToSpaceDialogProps> = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentName,
  accessToken,
  onMoved,
  messages: messagesProp,
  'data-testid': testId = 'move-to-space-dialog'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultMoveToSpaceMessages = {
    title: t('move-to-space-title'),
    descriptionWithName: t('move-to-space-description-with-name'),
    descriptionGeneric: t('move-to-space-description-generic'),
    searchPlaceholder: t('move-to-space-search-placeholder'),
    noMatching: t('move-to-space-no-matching'),
    noSpaces: t('move-to-space-no-spaces'),
    createFirst: t('move-to-space-create-first'),
    footerHint: t('move-to-space-footer-hint'),
    cancel: t('move-to-space-cancel'),
    move: t('move-to-space-move')
  }
  const messages = { ...defaultMoveToSpaceMessages, ...messagesProp }
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch spaces when dialog opens
  const fetchSpaces = useCallback(async () => {
    if (!accessToken) {
      setError(t('move-to-space-error-not-authenticated'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/spaces`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        throw new Error(t('move-to-space-error-fetch-failed'))
      }

      const data = await response.json()
      setSpaces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('move-to-space-error-fetch-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  // Fetch spaces when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSpaceId(null)
      setSearchQuery('')
      setError(null)
      fetchSpaces()
    }
  }, [open, fetchSpaces])

  // Move content to space
  const moveToSpace = useCallback(async () => {
    if (!selectedSpaceId) return

    if (!accessToken) {
      toast.error(t('move-to-space-error-not-authenticated'))
      return
    }

    // Map content type to backend entity type
    const entityType = contentType === 'spreadsheet' ? 'spreadsheet_app' : contentType

    try {
      setIsMoving(true)
      const response = await fetch(`${API_URL}/spaces/${selectedSpaceId}/content`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId: contentId
        })
      })

      if (!response.ok) {
        throw new Error(t('move-to-space-error-move-failed'))
      }

      toast.success(t('move-to-space-success'))
      onOpenChange(false)
      onMoved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('move-to-space-error-move-failed'))
    } finally {
      setIsMoving(false)
    }
  }, [selectedSpaceId, accessToken, contentType, contentId, onOpenChange, onMoved, t])

  // Filter spaces by search
  const filteredSpaces = searchQuery.trim()
    ? spaces.filter(
        space =>
          space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : spaces

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden gba:max-h-[80vh]" data-testid={testId}>
        {/* Header */}
        <div className="gba:relative gba:bg-gradient-to-br gba:from-primary/10 gba:via-primary/5 gba:to-transparent gba:border-b gba:border-border/50">
          <DialogHeader className="gba:p-6 gba:pb-4">
            <DialogTitle className="gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <FolderInput className="gba:w-5 gba:h-5 gba:text-primary" />
              {messages.title}
            </DialogTitle>
            <DialogDescription className="gba:text-muted-foreground">
              {contentName
                ? messages.descriptionWithName.replace(/{name}/g, contentName).replace(/{[^}]*name[^}]*}/g, contentName)
                : messages.descriptionGeneric.replace(/{[^}]*type[^}]*}/g, t('move-to-space-type-' + contentType))}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="gba:px-6 gba:pb-4">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder={messages.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-10 gba:h-10"
                data-testid={`${testId}-search`}
              />
            </div>
          </div>
        </div>

        {/* Space List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:max-h-[350px]">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Loader2 className="gba:w-6 gba:h-6 gba:animate-spin gba:text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-12">
              <p className="gba:text-destructive gba:text-sm">{error}</p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="gba:text-center gba:py-12">
              <FolderInput className="gba:w-12 gba:h-12 gba:text-muted-foreground/50 gba:mx-auto gba:mb-3" />
              <p className="gba:text-muted-foreground gba:text-sm">
                {searchQuery ? messages.noMatching : messages.noSpaces}
              </p>
              {!searchQuery && (
                <p className="gba:text-muted-foreground/70 gba:text-xs gba:mt-1">{messages.createFirst}</p>
              )}
            </div>
          ) : (
            <div className="gba:space-y-2">
              {filteredSpaces.map(space => {
                const scheme = getColorScheme(space.color)
                const isSelected = selectedSpaceId === space.id

                return (
                  <div
                    key={space.id}
                    onClick={() => setSelectedSpaceId(space.id)}
                    className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-xl gba:cursor-pointer gba:transition-all ${
                      isSelected
                        ? 'gba:bg-primary/10 gba:ring-2 gba:ring-primary/30'
                        : 'hover:gba:bg-muted/50 gba:border gba:border-border/50'
                    }`}
                    data-testid={`${testId}-space-${space.id}`}
                  >
                    {/* Monogram */}
                    <div
                      className={`gba:w-12 gba:h-12 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:text-lg gba:font-bold ${scheme.bg} ${scheme.text}`}
                    >
                      {getMonogram(space.name)}
                    </div>

                    {/* Info */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{space.name}</p>
                      {space.description && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{space.description}</p>
                      )}
                    </div>

                    {/* Privacy indicator */}
                    <div className="gba:flex-shrink-0">
                      {space.isPublic ? (
                        <Globe className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      ) : (
                        <Lock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:border-t gba:border-border/50 gba:p-4 gba:flex gba:items-center gba:justify-between gba:bg-muted/30">
          <p className="gba:text-xs gba:text-muted-foreground">{messages.footerHint}</p>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isMoving}>
              {messages.cancel}
            </Button>
            <Button
              size="sm"
              onClick={moveToSpace}
              disabled={!selectedSpaceId || isMoving}
              className="gba:gap-2"
              data-testid={`${testId}-move-button`}
            >
              {isMoving ? (
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : (
                <FolderInput className="gba:w-4 gba:h-4" />
              )}
              {messages.move}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveToSpaceDialog
