import React, { useCallback, useState } from 'react'
import { Spinner, toast, useTranslation } from '@newwork/nw-design-system'
import {
  Kanban,
  Users,
  Zap,
  FileText,
  Bug,
  CalendarDays,
  UserCheck,
  Rocket,
  Package,
  Printer,
  Plus
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Board, BoardRow, BoardSheet, BoardView } from '../../types'
import { ALL_TEMPLATES, buildBoardFromTemplate } from '../../templates'
import type { TemplateConfig } from '../../templates'
import translations from '../../_i18n'

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
const TEMPLATE_NAME_KEYS: Record<string, string> = {
  'project-tracker': 'template-project-tracker',
  'crm-pipeline': 'template-crm-pipeline',
  'sprint-board': 'template-sprint-board',
  'content-calendar': 'template-content-calendar',
  'bug-tracker': 'template-bug-tracker',
  'event-planning': 'template-event-planning',
  'recruitment-pipeline': 'template-recruitment-pipeline',
  'product-roadmap': 'template-product-roadmap',
  'inventory-tracker': 'template-inventory-tracker',
  'production-board': 'template-production-board'
}

function getTemplateName(t: (key: string, args?: Record<string, unknown>) => string, tpl: TemplateConfig): string {
  const key = TEMPLATE_NAME_KEYS[tpl.id]
  return key ? t(key) : tpl.name
}

export const BoardsHomeTemplates: React.FC<BoardsHomeTemplatesProps> = ({
  onCreateBoard,
  onBoardCreated,
  createRow,
  updateSheet,
  'data-testid': testId = 'boards-home-templates'
}) => {
  const { t } = useTranslation(translations)
  const [creating, setCreating] = useState<string | null>(null)

  const handleCreate = useCallback(
    async (tpl: TemplateConfig) => {
      setCreating(tpl.id)
      try {
        const boardData = buildBoardFromTemplate(tpl)
        const templateName = getTemplateName(t, tpl)
        boardData.name = templateName
        const board = await onCreateBoard(boardData)
        if (!board) {
          toast.error(t('home-template-create-failed'))
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

        toast.success(
          totalRows > 0
            ? t('home-template-created-with-items', { templateName, count: totalRows })
            : t('home-template-created', { templateName })
        )
        await onBoardCreated(board.id)
      } catch {
        toast.error(t('home-template-create-unexpected'))
      } finally {
        setCreating(null)
      }
    },
    [onCreateBoard, onBoardCreated, createRow, updateSheet, t]
  )

  return (
    <section data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <Plus className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        <h3 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
          {t('home-quick-start-title')}
        </h3>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        {ALL_TEMPLATES.map(tpl => {
          const IconComponent = ICON_MAP[tpl.iconName] || Kanban
          const isCreating = creating === tpl.id
          return (
            <button
              key={tpl.id}
              disabled={!!creating}
              onClick={() => handleCreate(tpl)}
              className="gba:flex gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-left gba:transition-colors gba:hover:bg-accent/50 gba:disabled:opacity-50"
              data-testid={`${testId}-${tpl.id}`}
            >
              {isCreating ? (
                <Spinner className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
              ) : (
                <IconComponent className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:shrink-0" />
              )}
              <span className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">
                {getTemplateName(t, tpl)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
