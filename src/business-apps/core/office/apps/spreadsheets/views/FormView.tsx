/**
 * FormView Component
 *
 * Card-based records view
 */

import React, { memo } from 'react'
import { Card, Button, useTranslation } from '@newwork/nw-design-system'
import { Pencil, Trash2 } from 'lucide-react'
import type { SpreadsheetSheet } from '../types'
import { formatCellValue } from './utils'
import translations from '../_i18n'

export interface FormViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  onEdit: (row: Record<string, unknown>) => void
  onDelete: (rowId: string) => void
  /** When false, edit/delete actions are disabled (e.g. when spreadsheet is locked by another user) */
  canEdit?: boolean
  testId: string
}

/**
 * FormView - Card-based records view
 */
export const FormView = memo<FormViewProps>(function FormView({
  sheet,
  data,
  onEdit,
  onDelete,
  canEdit = true,
  testId
}) {
  const { t } = useTranslation(translations)
  const visibleColumns = sheet.columns.filter(c => c.isVisible !== false)

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4" data-testid={testId}>
      {data.map(row => (
        <Card key={row._id as string} className="gba:p-4">
          <div className="gba:space-y-3">
            {visibleColumns.slice(0, 5).map(col => (
              <div key={col.id}>
                <p className="gba:text-xs gba:text-muted-foreground">{col.label}</p>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">{formatCellValue(row[col.name], col)}</p>
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="gba:flex gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t">
              <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('settings-edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(row._id as string)}>
                <Trash2 className="gba:w-4 gba:h-4 gba:mr-1 gba:text-destructive" />
                {t('action-delete-spreadsheet')}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
})

export default FormView
