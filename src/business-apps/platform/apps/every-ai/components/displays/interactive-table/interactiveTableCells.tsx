import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import EntityLink from '../../links/EntityLink'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'
import type { ChipCellValue, CurrencyCellValue, InteractiveTableColumn } from '../../../types/models'
import { formatCurrencyCell } from './formatCurrencyCell'
import { formatDateCell, isIsoDateLike } from './formatDateCell'

export function renderInteractiveTableCell(
  column: InteractiveTableColumn,
  value: unknown,
  accessToken: string
): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-xs gba:text-muted-foreground">—</span>
  }

  switch (column.dataType) {
    case 'chip': {
      const chip = value as ChipCellValue
      if (!chip?.id || !column.entityType) {
        return <span className="gba:text-sm">{chip?.label ?? String(value)}</span>
      }
      const href = `${column.entityType}://${chip.id}`
      return (
        <EntityLink href={href} accessToken={accessToken} variant="ai">
          {chip.label}
        </EntityLink>
      )
    }
    case 'chip_list': {
      const chips = value as ChipCellValue[]
      if (!Array.isArray(chips) || chips.length === 0) {
        return <span className="gba:text-xs gba:text-muted-foreground">—</span>
      }
      const entityType = column.entityType ?? 'entity'
      return (
        <div className="gba:flex gba:flex-wrap gba:gap-1 gba:max-w-md">
          {chips.map(chip => (
            <EntityLink key={chip.id} href={`${entityType}://${chip.id}`} accessToken={accessToken} variant="ai">
              {chip.label}
            </EntityLink>
          ))}
        </div>
      )
    }
    case 'currency': {
      const money = value as CurrencyCellValue
      if (typeof money?.value !== 'number' || !money?.unit) {
        return <span className="gba:text-xs gba:text-muted-foreground">—</span>
      }
      return <span className="gba:text-sm gba:tabular-nums gba:text-right gba:block">{formatCurrencyCell(money)}</span>
    }
    case 'number':
      return <span className="gba:text-sm gba:tabular-nums">{String(value)}</span>
    case 'date':
      return (
        <span className="gba:text-sm gba:whitespace-nowrap" data-testid="interactive-table-date-cell">
          {formatDateCell(String(value))}
        </span>
      )
    case 'boolean':
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
    case 'enum':
      return <Badge variant="outline">{String(value)}</Badge>
    case 'text':
    default: {
      const text = String(value)
      if (isIsoDateLike(text)) {
        return (
          <span className="gba:text-sm gba:whitespace-nowrap" data-testid="interactive-table-date-cell">
            {formatDateCell(text)}
          </span>
        )
      }
      return (
        <MarkdownWithChipsRenderer
          content={text}
          accessToken={accessToken}
          variant="ai"
          renderHttpLinksAsChips={false}
          className="gba:text-sm"
        />
      )
    }
  }
}
