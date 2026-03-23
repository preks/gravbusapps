import React from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { useBoardHomeData } from '../../hooks/useBoardHomeData'
import { BoardsHomeGreeting } from './BoardsHomeGreeting'
import { BoardsHomeActionItems } from './BoardsHomeActionItems'
import { BoardsHomeTemplates } from './BoardsHomeTemplates'
import type { Board, BoardSummary, BoardRow, BoardSheet } from '../../types'

interface BoardsHomeDashboardProps {
  accessToken: string
  userInfo?: { displayName?: string; firstName?: string; lastName?: string; email?: string }
  boards: BoardSummary[]
  onOpenBoard: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateOpen: () => void
  onCreateAI: () => void
  onSearchOpen: () => void
  onNavigateToItem: (boardId: string, sheetId: string, rowId: string) => void
  onCreateBoard: (board: Partial<Board>) => Promise<Board | null>
  onBoardCreated: (boardId: string) => Promise<void>
  createRow: (boardId: string, sheetId: string, data: Record<string, unknown>) => Promise<BoardRow | null>
  updateSheet: (boardId: string, sheetId: string, updates: Partial<BoardSheet>) => Promise<BoardSheet | null>
  'data-testid'?: string
}

export const BoardsHomeDashboard: React.FC<BoardsHomeDashboardProps> = ({
  userInfo,
  onNavigateToItem,
  onCreateBoard,
  onBoardCreated,
  createRow,
  updateSheet,
  'data-testid': testId = 'boards-home'
}) => {
  const { stats, myWork, isLoading, error } = useBoardHomeData(true)

  const userName =
    userInfo?.displayName ||
    (userInfo?.firstName && userInfo?.lastName
      ? `${userInfo.firstName} ${userInfo.lastName}`
      : userInfo?.firstName || userInfo?.email || '')

  if (error && !stats && !myWork) {
    return (
      <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:p-6" data-testid={testId}>
        <p className="gba:text-muted-foreground gba:text-sm">{error}</p>
      </div>
    )
  }

  const showSkeleton = isLoading && !stats && !myWork

  return (
    <div data-testid={testId}>
      <div className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:pt-6 gba:pb-10 gba:space-y-6">
        <BoardsHomeGreeting userName={userName} data-testid={`${testId}-greeting`} />

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-5 gba:gap-6">
          <div className="gba:lg:col-span-3">
            <BoardsHomeActionItems
              myWork={myWork}
              isLoading={showSkeleton}
              onNavigateToItem={onNavigateToItem}
              data-testid={`${testId}-actions`}
            />
          </div>

          <div className="gba:lg:col-span-2">
            <BoardsHomeTemplates
              onCreateBoard={onCreateBoard}
              onBoardCreated={onBoardCreated}
              createRow={createRow}
              updateSheet={updateSheet}
              data-testid={`${testId}-templates`}
            />
          </div>
        </div>
      </div>

      {isLoading && (stats || myWork) && (
        <div className="gba:fixed gba:bottom-4 gba:right-4 gba:bg-card gba:rounded-full gba:p-2.5">
          <Spinner className="gba:w-4 gba:h-4" />
        </div>
      )}
    </div>
  )
}
