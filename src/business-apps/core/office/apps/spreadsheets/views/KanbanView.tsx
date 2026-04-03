/**
 * KanbanView Component
 *
 * Kanban board view grouped by status
 */

import React, { memo } from 'react'
import { Card, Badge, useTranslation } from '@newwork/nw-design-system'
import type { SpreadsheetSheet, SheetView } from '../types'
import translations from '../_i18n'

export interface KanbanViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  view: SheetView
  onEdit: (row: Record<string, unknown>) => void
  /** When false, cards are not clickable for editing (e.g. when spreadsheet is locked by another user) */
  canEdit?: boolean
  testId: string
}

/**
 * KanbanView - Kanban board grouped by status column
 */
export const KanbanView = memo<KanbanViewProps>(function KanbanView({
  sheet,
  data,
  view,
  onEdit,
  canEdit = true,
  testId
}) {
  const { t } = useTranslation(translations)
  if (view.config.type !== 'kanban') {
    return null
  }

  const { statusColumn, titleColumn, descriptionColumn } = view.config
  const statusCol = sheet.columns.find(c => c.name === statusColumn || c.id === statusColumn)

  if (!statusCol) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">{t('view-kanban-status-column-not-found')}</p>
      </Card>
    )
  }

  // Get unique status values
  const statuses =
    statusCol.selectOptions?.map(o => o.value) ||
    [...new Set(data.map(row => String(row[statusCol.name] || '')))].filter(Boolean)

  // Group data by status
  const groupedData = statuses.reduce<Record<string, Record<string, unknown>[]>>((acc, status) => {
    acc[status] = data.filter(row => String(row[statusCol.name]) === status)
    return acc
  }, {})

  return (
    <div className="gba:flex gba:gap-4 gba:overflow-x-auto gba:pb-4" data-testid={testId}>
      {statuses.map(status => {
        const statusOption = statusCol.selectOptions?.find(o => o.value === status)
        const items = groupedData[status] || []

        return (
          <div key={status} className="gba:flex-shrink-0 gba:w-80 gba:bg-muted/30 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full"
                  style={{ backgroundColor: statusOption?.color || '#888' }}
                />
                <h3 className="gba:font-medium gba:text-foreground">{statusOption?.label || status}</h3>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>

            <div className="gba:space-y-3">
              {items.map(row => (
                <Card
                  key={row._id as string}
                  className={`gba:p-4 gba:transition-shadow ${canEdit ? 'gba:cursor-pointer gba:hover:shadow-md' : ''}`}
                  onClick={canEdit ? () => onEdit(row) : undefined}
                >
                  <p className="gba:font-medium gba:text-foreground gba:mb-1">
                    {String(row[titleColumn] || t('view-kanban-untitled'))}
                  </p>
                  {descriptionColumn && Boolean(row[descriptionColumn]) && (
                    <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">
                      {String(row[descriptionColumn])}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default KanbanView
