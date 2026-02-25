import React, { useCallback, useState } from 'react'
import { Card, Spinner, toast } from '@newwork/nw-design-system'
import { Kanban, Users, Zap, FileText, Bug, CalendarDays, UserCheck, Rocket, Package, Printer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Board, BoardRow, BoardSheet, BoardView } from '../../types'
import { ALL_TEMPLATES, buildBoardFromTemplate } from '../../templates'
import type { TemplateConfig } from '../../templates'

interface BoardsHomeTemplatesProps {
  onCreateBoard: (board: Partial<Board>) => Promise<Board | null>
  onBoardCreated: (boardId: string) => Promise<void>
  createRow: (boardId: string, sheetId: string, data: Record<string, unknown>) => Promise<BoardRow | null>
  updateSheet: (boardId: string, sheetId: string, updates: Partial<BoardSheet>) => Promise<BoardSheet | null>
  'data-testid'?: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  Kanban,
  Users,
  Zap,
  FileText,
  Bug,
  CalendarDays,
  UserCheck,
  Rocket,
  Package,
  Printer
}

const ROW_BATCH_SIZE = 5

export const BoardsHomeTemplates: React.FC<BoardsHomeTemplatesProps> = ({
  onCreateBoard,
  onBoardCreated,
  createRow,
  updateSheet,
  'data-testid': testId = 'boards-home-templates'
}) => {
  const [creating, setCreating] = useState<string | null>(null)

  const handleCreate = useCallback(
    async (tpl: TemplateConfig) => {
      setCreating(tpl.id)
      try {
        const boardData = buildBoardFromTemplate(tpl)
        const board = await onCreateBoard(boardData)
        if (!board) {
          toast.error('Failed to create board from template')
          return
        }

        for (let si = 0; si < tpl.sheets.length; si++) {
          const createdSheet = board.sheets[si]
          if (!createdSheet) continue

          const templateViews = boardData.sheets?.[si]?.views as BoardView[] | undefined
          if (templateViews && templateViews.length > 1) {
            await updateSheet(board.id, createdSheet.id, { views: templateViews }).catch(() => null)
          }
        }

        let totalRows = 0
        for (let si = 0; si < tpl.sheets.length; si++) {
          const sheetConfig = tpl.sheets[si]
          const sheetId = board.sheets[si]?.id
          if (!sheetId) continue

          const rows = sheetConfig.getSeedRows()
          if (rows.length === 0) continue

          for (let i = 0; i < rows.length; i += ROW_BATCH_SIZE) {
            await Promise.all(
              rows.slice(i, i + ROW_BATCH_SIZE).map(rowData => createRow(board.id, sheetId, rowData).catch(() => null))
            )
          }
          totalRows += rows.length
        }

        const msg = totalRows > 0 ? `${tpl.name} created with ${totalRows} sample items` : `${tpl.name} board created`
        toast.success(msg)
        await onBoardCreated(board.id)
      } catch {
        toast.error('Something went wrong creating the board')
      } finally {
        setCreating(null)
      }
    },
    [onCreateBoard, onBoardCreated, createRow, updateSheet]
  )

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Quick start
      </h3>
      <div className="gba:space-y-2">
        {ALL_TEMPLATES.map(tpl => {
          const IconComponent = ICON_MAP[tpl.iconName] || Kanban
          return (
            <Card
              key={tpl.id}
              className="gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
              onClick={() => !creating && handleCreate(tpl)}
              data-testid={`${testId}-${tpl.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
                <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-accent/50 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:text-accent-foreground">
                  {creating === tpl.id ? (
                    <Spinner className="gba:w-4 gba:h-4" />
                  ) : (
                    <IconComponent className="gba:w-5 gba:h-5" />
                  )}
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{tpl.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{tpl.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
