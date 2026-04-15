import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { BoardSheet } from '../../types'
import translations from '../../_i18n'

export interface BoardViewerFooterProps {
  sheets: BoardSheet[]
  activeSheetId: string
  onSelectSheet: (sheetId: string) => void
  rowsTotal: number
  page: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
  onAddRow?: () => void
  hidePagination?: boolean
  loadedRows?: number
  testId: string
}

export const BoardViewerFooter: React.FC<BoardViewerFooterProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  rowsTotal,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddRow,
  hidePagination,
  loadedRows,
  testId
}) => {
  const { t } = useTranslation(translations)

  return (
    <footer className="gba:border-t gba:bg-card gba:px-6 gba:py-2 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0">
      <div className="gba:flex gba:items-center gba:gap-1 gba:overflow-x-auto">
        {sheets.map(sheet => (
          <button
            key={sheet.id}
            onClick={() => onSelectSheet(sheet.id)}
            className={`gba:px-2.5 gba:py-1 gba:text-xs gba:rounded-md gba:transition-colors gba:whitespace-nowrap ${
              activeSheetId === sheet.id
                ? 'gba:bg-accent gba:text-accent-foreground gba:font-medium'
                : 'gba:text-muted-foreground gba:hover:bg-muted/50'
            }`}
            data-testid={`${testId}-sheet-${sheet.id}`}
          >
            {sheet.name}
          </button>
        ))}
      </div>

      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-xs gba:text-muted-foreground">
          {hidePagination && loadedRows != null
            ? t('board-viewer-loaded-summary', { loaded: loadedRows, total: rowsTotal })
            : t('board-viewer-page-summary', {
                total: rowsTotal,
                page,
                totalPages,
                showPage: totalPages > 1
              })}
        </span>

        {!hidePagination && totalPages > 1 && (
          <div className="gba:flex gba:gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-6 gba:px-1.5 gba:text-xs"
              disabled={page <= 1}
              onClick={onPrevPage}
              data-testid={`${testId}-prev-page`}
            >
              {t('common-prev')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-6 gba:px-1.5 gba:text-xs"
              disabled={page >= totalPages}
              onClick={onNextPage}
              data-testid={`${testId}-next-page`}
            >
              {t('common-next')}
            </Button>
          </div>
        )}

        {onAddRow && (
          <Button
            size="sm"
            variant="ghost"
            className="gba:h-6 gba:text-xs gba:gap-1"
            onClick={onAddRow}
            data-testid={`${testId}-add-row`}
          >
            <Plus className="gba:w-3 gba:h-3" /> {t('board-add-row')}
          </Button>
        )}
      </div>
    </footer>
  )
}
