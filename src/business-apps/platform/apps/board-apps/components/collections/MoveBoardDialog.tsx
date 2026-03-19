import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  ScrollArea
} from '@newwork/nw-design-system'
import { FolderClosed, ArrowRight, Search, X } from 'lucide-react'
import type { BoardCollection } from '../../types/collection'

export interface MoveBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardName: string
  currentCollectionId?: string | null
  collections: BoardCollection[]
  onMove: (collectionId: string) => void
  onRemoveFromCollection?: () => void
  'data-testid'?: string
}

export const MoveBoardDialog: React.FC<MoveBoardDialogProps> = ({
  open,
  onOpenChange,
  boardName,
  currentCollectionId,
  collections,
  onMove,
  onRemoveFromCollection,
  'data-testid': testId = 'move-board-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = collections.filter(c => c.id !== currentCollectionId)
    if (!query) return filtered
    return filtered.filter(c => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query))
  }, [collections, currentCollectionId, searchQuery])

  const handleConfirm = () => {
    if (selectedId) {
      onMove(selectedId)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <ArrowRight className="gba:w-5 gba:h-5 gba:text-primary" />
            Move to Collection
          </DialogTitle>
          <DialogDescription>Move &quot;{boardName}&quot; to a collection.</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-3 gba:py-4">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search collections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-9"
              data-testid={`${testId}-search`}
            />
          </div>

          <ScrollArea className="gba:max-h-64">
            <div className="gba:space-y-1">
              {filteredCollections.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-6">
                  {collections.length === 0 ? 'No collections yet. Create one first.' : 'No matching collections.'}
                </p>
              ) : (
                filteredCollections.map(collection => (
                  <button
                    key={collection.id}
                    className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md gba:transition-colors gba:text-left ${
                      selectedId === collection.id
                        ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/30'
                        : 'gba:hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedId(collection.id)}
                    data-testid={`${testId}-option-${collection.id}`}
                  >
                    <div
                      className="gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:flex-shrink-0"
                      style={{
                        backgroundColor: collection.color ? `${collection.color}20` : undefined,
                        color: collection.color || undefined
                      }}
                    >
                      {collection.icon || <FolderClosed className="gba:w-4 gba:h-4" />}
                    </div>
                    <div className="gba:min-w-0 gba:flex-1">
                      <p className="gba:text-sm gba:font-medium gba:truncate">{collection.name}</p>
                      {collection.description && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{collection.description}</p>
                      )}
                    </div>
                    <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                      {collection.boardCount} boards
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {currentCollectionId && onRemoveFromCollection && (
            <>
              <div className="gba:border-t gba:border-border" />
              <button
                className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:text-muted-foreground gba:hover:bg-muted/50 gba:transition-colors"
                onClick={() => {
                  onRemoveFromCollection()
                  onOpenChange(false)
                }}
                data-testid={`${testId}-remove`}
              >
                <X className="gba:w-4 gba:h-4" />
                Remove from current collection
              </button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId} data-testid={`${testId}-submit`}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
