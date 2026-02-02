/**
 * MoveToSpaceDialog - Dialog for moving content to a space
 *
 * Used from document/note/spreadsheet hubs to move items to spaces
 */

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input
} from '@newwork/nw-design-system'
import { FolderInput, Search, Loader2, Lock, Globe } from 'lucide-react'
import { useSpaces } from '../hooks/useSpaces'

export interface MoveToSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (spaceId: string) => Promise<void>
  contentType: 'document' | 'note' | 'spreadsheet'
  contentName?: string
  'data-testid'?: string
}

export const MoveToSpaceDialog: React.FC<MoveToSpaceDialogProps> = ({
  open,
  onOpenChange,
  onMove,
  contentType,
  contentName,
  'data-testid': testId = 'move-to-space-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Fetch user's spaces (owned + member of)
  const { spaces, isLoading, error } = useSpaces({ includeMembers: false })

  // Filter spaces by search query
  const filteredSpaces = searchQuery.trim()
    ? spaces.filter(
        space =>
          space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : spaces

  // Handle move
  const handleMove = useCallback(async () => {
    if (!selectedSpaceId) return

    setIsMoving(true)
    try {
      await onMove(selectedSpaceId)
      setSelectedSpaceId(null)
      setSearchQuery('')
      onOpenChange(false)
    } finally {
      setIsMoving(false)
    }
  }, [selectedSpaceId, onMove, onOpenChange])

  // Reset on close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedSpaceId(null)
        setSearchQuery('')
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'document':
        return 'document'
      case 'note':
        return 'note'
      case 'spreadsheet':
        return 'spreadsheet'
      default:
        return 'item'
    }
  }

  // Get first letter for monogram
  const getMonogram = (name: string) => name.charAt(0).toUpperCase()

  // Color schemes for space cards
  const colorSchemes: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'gba:bg-sky-500/20', text: 'gba:text-sky-600' },
    purple: { bg: 'gba:bg-fuchsia-500/20', text: 'gba:text-fuchsia-600' },
    green: { bg: 'gba:bg-emerald-500/20', text: 'gba:text-emerald-600' },
    orange: { bg: 'gba:bg-orange-500/20', text: 'gba:text-orange-600' },
    pink: { bg: 'gba:bg-pink-500/20', text: 'gba:text-pink-600' },
    cyan: { bg: 'gba:bg-cyan-500/20', text: 'gba:text-cyan-600' }
  }

  const getColorScheme = (color?: string) => colorSchemes[color || 'blue'] || colorSchemes.blue

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden gba:max-h-[80vh]" data-testid={testId}>
        {/* Header */}
        <div className="gba:relative gba:bg-gradient-to-br gba:from-primary/10 gba:via-primary/5 gba:to-transparent gba:border-b gba:border-border/50">
          <DialogHeader className="gba:p-6 gba:pb-4">
            <DialogTitle className="gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <FolderInput className="gba:w-5 gba:h-5 gba:text-primary" />
              Move to Space
            </DialogTitle>
            <DialogDescription className="gba:text-muted-foreground">
              {contentName
                ? `Move "${contentName}" to a space`
                : `Select a space to move this ${getContentTypeLabel()}`}
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
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={isMoving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMove}
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
