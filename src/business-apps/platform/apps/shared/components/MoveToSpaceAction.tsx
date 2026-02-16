/**
 * MoveToSpaceDialog - Dialog for moving content to spaces
 *
 * Following the same pattern as other dialogs in the hubs (ShareDocumentDialog, etc.)
 * The dialog state should be managed by the parent component.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
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
  'data-testid'?: string
}

export const MoveToSpaceMenuItem: React.FC<MoveToSpaceMenuItemProps> = ({
  onClick,
  'data-testid': testId = 'move-to-space-menu-item'
}) => (
  <DropdownMenuItem onClick={onClick} data-testid={testId}>
    <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
    Move to Space
  </DropdownMenuItem>
)

/**
 * MoveToSpaceDialog - The dialog component
 * Render this at the parent level, outside any dropdown
 */
export interface MoveToSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: 'document' | 'note' | 'spreadsheet'
  contentId: string
  contentName?: string
  accessToken?: string
  onMoved?: () => void
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
  'data-testid': testId = 'move-to-space-dialog'
}) => {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch spaces when dialog opens
  const fetchSpaces = useCallback(async () => {
    if (!accessToken) {
      setError('Not authenticated')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/spaces`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch spaces')
      }

      const data = await response.json()
      setSpaces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spaces')
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
      toast.error('Not authenticated')
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
        throw new Error('Failed to move content')
      }

      toast.success(`Moved to space successfully`)
      onOpenChange(false)
      onMoved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move content')
    } finally {
      setIsMoving(false)
    }
  }, [selectedSpaceId, accessToken, contentType, contentId, onOpenChange, onMoved])

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
              Move to Space
            </DialogTitle>
            <DialogDescription className="gba:text-muted-foreground">
              {contentName ? `Move "${contentName}" to a space` : `Select a space to move this ${contentType}`}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="gba:px-6 gba:pb-4">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search spaces..."
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
                {searchQuery ? 'No matching spaces found' : 'No spaces available'}
              </p>
              {!searchQuery && (
                <p className="gba:text-muted-foreground/70 gba:text-xs gba:mt-1">
                  Create a space first to organize your content
                </p>
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
          <p className="gba:text-xs gba:text-muted-foreground">
            Content will be moved exclusively to the selected space
          </p>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isMoving}>
              Cancel
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
              Move
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveToSpaceDialog
