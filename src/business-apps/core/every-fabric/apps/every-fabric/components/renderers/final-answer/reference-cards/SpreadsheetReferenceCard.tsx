import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useSpreadsheetReference } from './hooks/officeReferenceHooks'
import { dataStr, getField, getStr, type ReferenceCardProps } from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

const SHEET_GLYPH = tileGlyph('M4 4h16v16H4V4zm0 5h16M4 14h16M10 9v11')

/** Spreadsheet card: leads with app name, sheet/row counts and last-updated. */
export const SpreadsheetReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, countChip, humanizeToken, relativeOrShortDate, t } = useReferenceCardI18n()
  const { data: app, loading } = useSpreadsheetReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={SHEET_GLYPH} accent="emerald" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-spreadsheet"
      />
    )
  }

  const title = getStr(app, 'name') ?? reference.label ?? dataStr(reference.data, 'title') ?? reference.id
  const status = humanizeToken(getStr(app, 'status'))
  const updated = relativeOrShortDate(getStr(app, 'updatedAt'))
  const sheets = getField(app, 'sheets')
  const sheetCount = Array.isArray(sheets) ? sheets.length : undefined
  const rowCount = Array.isArray(sheets)
    ? sheets.reduce((sum: number, sheet) => {
        const data = getField(sheet, 'data')
        return sum + (Array.isArray(data) ? data.length : 0)
      }, 0)
    : undefined

  const fields: Array<{ label: string; value: string }> = []
  const sheetsLabel = countChip(sheetCount, 'sheet')
  if (sheetsLabel) fields.push({ label: field('sheets'), value: sheetsLabel })
  const rowsLabel = countChip(rowCount, 'row')
  if (rowsLabel) fields.push({ label: field('rows'), value: rowsLabel })
  if (updated) fields.push({ label: field('updated'), value: updated })

  return (
    <EntityCard
      title={title}
      subtitle={t('renderer-ref-type-spreadsheet')}
      status={status}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-spreadsheet"
    />
  )
}

export default SpreadsheetReferenceCard
