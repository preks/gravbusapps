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
  ScrollArea,
  Checkbox
} from '@newwork/nw-design-system'
import { Plus, Search, LayoutGrid } from 'lucide-react'
import type { BoardSummary } from '../../types'

export interface AddBoardToCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionName: string
  collectionId: string
  boards: BoardSummary[]
  onAdd: (boardIds: string[]) => void
  'data-testid'?: string
}

export const AddBoardToCollectionDialog: React.FC<AddBoardToCollectionDialogProps> = ({
  open,
  onOpenChange,
  collectionName,
  collectionId,
  boards,
  onAdd,
  'data-testid': testId = 'add-board-to-collection-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const availableBoards = useMemo(() => {
    const notInCollection = boards.filter(b => b.spaceId !== collectionId)
    const query = searchQuery.trim().toLowerCase()
    if (!query) return notInCollection
    return notInCollection.filter(
      b => b.name.toLowerCase().includes(query) || b.description?.toLowerCase().includes(query)
    )
  }, [boards, collectionId, searchQuery])

  const toggleBoard = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedIds.size > 0) {
      onAdd(Array.from(selectedIds))
      setSelectedIds(new Set())
      setSearchQuery('')
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Plus className="gba:w-5 gba:h-5 gba:text-primary" />
            Add Boards
          </DialogTitle>
          <DialogDescription>Select boards to add to &quot;{collectionName}&quot;.</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-3 gba:py-4">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-9"
              data-testid={`${testId}-search`}
            />
          </div>

          <ScrollArea className="gba:max-h-72">
            <div className="gba:space-y-1">
              {availableBoards.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-6">
                  {searchQuery.trim() ? 'No matching boards found.' : 'All boards are already in this collection.'}
                </p>
              ) : (
                availableBoards.map(board => {
                  const isSelected = selectedIds.has(board.id)
                  return (
                    <button
                      key={board.id}
                      className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md gba:transition-colors gba:text-left ${
                        isSelected ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/30' : 'gba:hover:bg-muted/50'
                      }`}
                      onClick={() => toggleBoard(board.id)}
                      data-testid={`${testId}-option-${board.id}`}
                    >
                      <Checkbox checked={isSelected} className="gba:pointer-events-none" tabIndex={-1} />
                      <div className="gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-muted">
                        {board.icon ? (
                          <span className="gba:text-base">{board.icon}</span>
                        ) : (
                          <LayoutGrid className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                        )}
                      </div>
                      <div className="gba:min-w-0 gba:flex-1">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{board.name}</p>
                        {board.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{board.description}</p>
                        )}
                      </div>
                      <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums gba:whitespace-nowrap">
                        {board.sheetCount} sheet{board.sheetCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {selectedIds.size > 0 && (
            <p className="gba:text-xs gba:text-muted-foreground">
              {selectedIds.size} board{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0} data-testid={`${testId}-submit`}>
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
