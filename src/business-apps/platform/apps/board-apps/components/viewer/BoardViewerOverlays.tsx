import React from 'react'
import type { Board, BoardRow, BoardSheet } from '../../types'
import { BoardSearchDialog } from '../search/BoardSearchDialog'
import { BoardSettingsSheet } from '../settings/BoardSettingsSheet'
import { AddViewDialog } from '../views/AddViewDialog'
import type { SearchResult } from '../../hooks/useBoardSearch'

export interface BoardViewerOverlaysProps {
  board: Board
  accessToken: string
  activeSheet: BoardSheet | null
  rows: BoardRow[]
  page: number
  onReloadBoard?: (id: string) => Promise<void>
  onLoadRows: (boardId: string, sheetId: string, options?: { page?: number; limit?: number }) => Promise<void>
  onBoardUpdate?: (id: string, updates: Partial<Board>) => Promise<void>
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Partial<BoardSheet>) => Promise<BoardSheet | null>
  onOpenImport?: () => void
  onOpenFlowImport?: () => void
  onOpenExternalImport?: () => void

  isSearchOpen: boolean
  setIsSearchOpen: (open: boolean) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  isAddViewOpen: boolean
  setIsAddViewOpen: (open: boolean) => void

  onSelectSearchResult?: (result: SearchResult) => void
  onOpenRow: (row: BoardRow) => void
  setActiveViewId: (id: string) => void
  testId: string
}

export const BoardViewerOverlays: React.FC<BoardViewerOverlaysProps> = ({
  board,
  accessToken,
  activeSheet,
  rows,
  onBoardUpdate,
  onSheetUpdate,
  onOpenImport,
  onOpenFlowImport,
  onOpenExternalImport,
  isSearchOpen,
  setIsSearchOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  isAddViewOpen,
  setIsAddViewOpen,
  onSelectSearchResult,
  onOpenRow,
  setActiveViewId,
  testId
}) => {
  return (
    <>
      <BoardSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        accessToken={accessToken}
        boardId={board.id}
        sheetId={activeSheet?.id}
        columns={activeSheet?.columns}
        onSelectResult={
          onSelectSearchResult
            ? onSelectSearchResult
            : r => {
                const inMemory = rows.find(x => x.id === r.rowId)
                if (inMemory) onOpenRow(inMemory)
                else onOpenRow({ id: r.rowId, data: r.data || {} })
              }
        }
        data-testid={`${testId}-search-dialog`}
      />

      <BoardSettingsSheet
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        board={board}
        activeSheet={activeSheet || null}
        onUpdateBoard={
          onBoardUpdate
            ? async updates => {
                await onBoardUpdate(board.id, updates)
              }
            : undefined
        }
        onSheetUpdate={
          onSheetUpdate
            ? async (bId, sId, updates) => {
                await onSheetUpdate(bId, sId, updates as any)
              }
            : undefined
        }
        onOpenImport={onOpenImport}
        onOpenFlowImport={onOpenFlowImport}
        onOpenExternalImport={onOpenExternalImport}
        data-testid={`${testId}-settings-sheet`}
      />

      {activeSheet && (
        <AddViewDialog
          open={isAddViewOpen}
          onOpenChange={setIsAddViewOpen}
          columns={activeSheet.columns}
          existingViews={activeSheet.views}
          onCreate={async newView => {
            if (!onSheetUpdate) return
            const nextViews = [...activeSheet.views, newView]
            const updated = await onSheetUpdate(board.id, activeSheet.id, { views: nextViews } as Partial<BoardSheet>)
            if (updated) setActiveViewId(newView.id)
          }}
          data-testid={`${testId}-add-view-dialog`}
        />
      )}
    </>
  )
}
