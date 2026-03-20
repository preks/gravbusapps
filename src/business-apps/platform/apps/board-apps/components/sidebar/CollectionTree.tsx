import React, { useState, useCallback } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import {
  ChevronRight,
  FolderClosed,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Share2,
  Pencil,
  Trash2,
  Plus,
  ExternalLink
} from 'lucide-react'
import type { BoardCollection } from '../../types/collection'
import type { BoardSummary } from '../../types/board'

export interface CollectionTreeProps {
  collections: BoardCollection[]
  collectionBoards: Map<string, BoardSummary[]>
  activeCollectionId: string | null
  activeBoardId: string | null
  onSelectCollection: (id: string) => void
  onSelectBoard: (boardId: string) => void
  onShareCollection: (id: string) => void
  onRenameCollection: (id: string) => void
  onDeleteCollection: (id: string) => void
  onAddBoardToCollection: (collectionId: string) => void
  onCreateBoardInCollection: (collectionId: string) => void
  onLoadCollectionBoards: (id: string) => void
  onShareBoard?: (boardId: string) => void
  onRenameBoard?: (boardId: string) => void
  onDeleteBoard?: (boardId: string) => void
  onOpenInSpaces?: (collectionId: string) => void
  'data-testid'?: string
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  collectionBoards,
  activeCollectionId,
  activeBoardId,
  onSelectCollection,
  onSelectBoard,
  onShareCollection,
  onRenameCollection,
  onDeleteCollection,
  onAddBoardToCollection,
  onCreateBoardInCollection,
  onLoadCollectionBoards,
  onShareBoard,
  onRenameBoard,
  onDeleteBoard,
  onOpenInSpaces,
  'data-testid': testId = 'collection-tree'
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openBoardMenuId, setOpenBoardMenuId] = useState<string | null>(null)

  const toggleExpand = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
          if (!collectionBoards.has(id)) onLoadCollectionBoards(id)
        }
        return next
      })
    },
    [collectionBoards, onLoadCollectionBoards]
  )

  if (collections.length === 0) {
    return (
      <div className="gba:px-4 gba:py-3">
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">No spaces yet</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-0.5" data-testid={testId}>
      {collections.map(collection => {
        const isExpanded = expandedIds.has(collection.id)
        const isActive = activeCollectionId === collection.id
        const boards = collectionBoards.get(collection.id) || []
        const FolderIcon = isExpanded ? FolderOpen : FolderClosed

        return (
          <div key={collection.id}>
            <div
              className={`gba:group gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:cursor-pointer gba:transition-colors ${
                isActive && !activeBoardId
                  ? 'gba:bg-primary/8 gba:text-foreground gba:border gba:border-primary/15'
                  : 'gba:text-muted-foreground gba:hover:bg-background/60 gba:hover:text-foreground'
              }`}
              onClick={() => onSelectCollection(collection.id)}
              data-testid={`${testId}-item-${collection.id}`}
            >
              <button
                className={`gba:p-0.5 gba:rounded gba:flex-shrink-0 ${
                  isActive && !activeBoardId ? 'gba:hover:bg-white/10' : 'gba:hover:bg-muted/50'
                }`}
                onClick={e => toggleExpand(collection.id, e)}
                data-testid={`${testId}-expand-${collection.id}`}
              >
                <ChevronRight
                  className={`gba:w-3.5 gba:h-3.5 gba:transition-transform gba:duration-150 ${
                    isExpanded ? 'gba:rotate-90' : ''
                  }`}
                />
              </button>
              <FolderIcon
                className={`gba:w-4 gba:h-4 gba:flex-shrink-0 ${isActive && !activeBoardId ? 'gba:opacity-90' : 'gba:opacity-70'}`}
                style={collection.color ? { color: collection.color } : undefined}
              />
              <span className="gba:flex-1 gba:text-sm gba:truncate gba:select-none">
                {collection.icon ? `${collection.icon} ` : ''}
                {collection.name}
              </span>
              {collection.boardCount > 0 && openMenuId !== collection.id && (
                <span
                  className={`gba:text-xs gba:tabular-nums gba:mr-1 gba:group-hover:hidden ${
                    isActive && !activeBoardId ? 'gba:text-decorative-foreground/65' : 'gba:text-muted-foreground/60'
                  }`}
                >
                  {collection.boardCount}
                </span>
              )}
              <div
                className={`gba:flex gba:items-center gba:transition-opacity ${
                  openMenuId === collection.id ? 'gba:opacity-100' : 'gba:opacity-0 gba:group-hover:opacity-100'
                }`}
                onClick={e => e.stopPropagation()}
              >
                <DropdownMenu
                  open={openMenuId === collection.id}
                  onOpenChange={open => setOpenMenuId(open ? collection.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-5 gba:w-5 gba:p-0 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60"
                      data-testid={`${testId}-menu-${collection.id}`}
                    >
                      <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="right" sideOffset={8}>
                    <DropdownMenuItem onClick={() => onAddBoardToCollection(collection.id)}>
                      <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Add board
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShareCollection(collection.id)}>
                      <Share2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRenameCollection(collection.id)}>
                      <Pencil className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Rename
                    </DropdownMenuItem>
                    {onOpenInSpaces && (
                      <DropdownMenuItem onClick={() => onOpenInSpaces(collection.id)}>
                        <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Open in Spaces
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gba:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this space? Boards will not be deleted.')) onDeleteCollection(collection.id)
                      }}
                    >
                      <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isExpanded && (
              <div className="gba:ml-4 gba:space-y-0.5 gba:mt-0.5">
                {boards.length === 0 ? (
                  <p className="gba:text-xs gba:text-muted-foreground/70 gba:pl-6 gba:py-1">No boards</p>
                ) : (
                  boards.map(board => {
                    const isBoardActive = activeBoardId === board.id
                    return (
                      <div
                        key={board.id}
                        className={`gba:group/board gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-sm gba:transition-colors gba:cursor-pointer ${
                          isBoardActive
                            ? 'gba:bg-primary/8 gba:text-foreground gba:border gba:border-primary/15'
                            : 'gba:text-muted-foreground gba:hover:bg-background/60 gba:hover:text-foreground'
                        }`}
                        onClick={() => onSelectBoard(board.id)}
                        data-testid={`${testId}-board-${board.id}`}
                      >
                        <LayoutGrid
                          className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isBoardActive ? 'gba:text-decorative-foreground gba:opacity-95' : 'gba:opacity-60'}`}
                        />
                        <span className="gba:truncate gba:flex-1">{board.name}</span>
                        <div
                          className={`gba:flex gba:items-center gba:transition-opacity ${
                            openBoardMenuId === board.id
                              ? 'gba:opacity-100'
                              : 'gba:opacity-0 gba:group-hover/board:opacity-100'
                          }`}
                          onClick={e => e.stopPropagation()}
                        >
                          <DropdownMenu
                            open={openBoardMenuId === board.id}
                            onOpenChange={o => setOpenBoardMenuId(o ? board.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-5 gba:w-5 gba:p-0 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60"
                                data-testid={`${testId}-board-menu-${board.id}`}
                              >
                                <MoreHorizontal className="gba:w-3.5 gba:h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="right" sideOffset={8}>
                              {onShareBoard && (
                                <DropdownMenuItem onClick={() => onShareBoard(board.id)}>
                                  <Share2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Share
                                </DropdownMenuItem>
                              )}
                              {onRenameBoard && (
                                <DropdownMenuItem onClick={() => onRenameBoard(board.id)}>
                                  <Pencil className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Rename
                                </DropdownMenuItem>
                              )}
                              {onDeleteBoard && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gba:text-destructive"
                                    onClick={() => {
                                      if (confirm(`Delete "${board.name}"? This cannot be undone.`))
                                        onDeleteBoard(board.id)
                                    }}
                                  >
                                    <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })
                )}
                <button
                  className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-xs gba:text-muted-foreground gba:hover:bg-primary/10 gba:hover:text-primary gba:transition-colors"
                  onClick={() => onCreateBoardInCollection(collection.id)}
                  data-testid={`${testId}-add-board-${collection.id}`}
                >
                  <Plus className="gba:w-3 gba:h-3" />
                  <span>Add board</span>
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
