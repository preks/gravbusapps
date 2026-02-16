/**
 * View Utilities
 *
 * Helper functions for rendering cell values in views
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { SpreadsheetColumn } from '../types'
import { isValidUrl, parseMarkdownLink } from '../utils/linkUtils'

/**
 * Check if a value is a workflow status and return badge variant
 */
export function getStatusBadgeVariant(
  value: string
): 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | null {
  const normalizedValue = value.toLowerCase().trim()

  // Success statuses
  if (['completed', 'submitted', 'approved', 'done', 'finished', 'success'].includes(normalizedValue)) {
    return 'success'
  }

  // Warning statuses (in progress)
  if (['sent', 'pending', 'waiting', 'in progress', 'in_progress', 'running', 'processing'].includes(normalizedValue)) {
    return 'warning'
  }

  // Error/failure statuses
  if (['failed', 'error', 'rejected', 'cancelled', 'canceled', 'timeout', 'timed_out'].includes(normalizedValue)) {
    return 'destructive'
  }

  // Info statuses
  if (['draft', 'new', 'created'].includes(normalizedValue)) {
    return 'info'
  }

  return null
}

function isEmptyCellValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function isFormulaErrorValue(value: unknown): boolean {
  return value === '#ERROR!' || (typeof value === 'string' && value.startsWith('#ERROR'))
}

function renderStatusBadgeIfNeeded(
  value: unknown,
  column: SpreadsheetColumn,
  isStatusColumn?: boolean
): React.ReactNode | null {
  if (typeof value !== 'string') return null
  const isStatusByName = column.name?.toLowerCase().includes('status') || column.label?.toLowerCase().includes('status')
  if (!isStatusColumn && !isStatusByName) return null

  const badgeVariant = getStatusBadgeVariant(value)
  if (!badgeVariant) return null

  return (
    <Badge variant={badgeVariant} className="gba:font-medium">
      {value}
    </Badge>
  )
}

function renderMarkdownOrUrlValue(value: string): React.ReactNode | null {
  const linkData = parseMarkdownLink(value)
  if (linkData) {
    return (
      <a
        href={linkData.url}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-primary gba:hover:underline"
        onClick={e => e.stopPropagation()}
        title={linkData.url}
      >
        {linkData.title}
      </a>
    )
  }

  if (isValidUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-primary gba:hover:underline"
        onClick={e => e.stopPropagation()}
        title={value}
      >
        {value}
      </a>
    )
  }

  return null
}

function renderValueByColumnType(value: unknown, column: SpreadsheetColumn): React.ReactNode {
  switch (column.type) {
    case 'currency':
      return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    case 'percentage':
      return `${Number(value).toFixed(1)}%`
    case 'date':
      return new Date(String(value)).toLocaleDateString()
    case 'datetime':
      return new Date(String(value)).toLocaleString()
    case 'boolean':
      return value ? '\u2713' : '\u2717'
    case 'select': {
      const option = column.selectOptions?.find(o => o.value === String(value))
      if (option) {
        return (
          <Badge variant="secondary" style={{ backgroundColor: option.color ? `${option.color}20` : undefined }}>
            {option.label}
          </Badge>
        )
      }
      return String(value)
    }
    case 'email':
      return (
        <a href={`mailto:${value}`} className="gba:text-primary gba:hover:underline">
          {String(value)}
        </a>
      )
    case 'url': {
      const linkText = column.name === '_copy_link' ? (column.label || 'View Response') : String(value)
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="gba:text-primary gba:hover:underline"
        >
          {linkText}
        </a>
      )
    }
    default: {
      const stringValue = String(value)
      return renderMarkdownOrUrlValue(stringValue) || stringValue
    }
  }
}

/**
 * Format cell value for display
 */
export function formatCellValue(value: unknown, column: SpreadsheetColumn, isStatusColumn?: boolean): React.ReactNode {
  if (isEmptyCellValue(value)) {
    return <span className="gba:text-muted-foreground">-</span>
  }

  // Handle formula errors
  if (isFormulaErrorValue(value)) {
    return <span className="gba:text-destructive">#ERROR!</span>
  }

  const statusBadge = renderStatusBadgeIfNeeded(value, column, isStatusColumn)
  if (statusBadge) return statusBadge

  return renderValueByColumnType(value, column)
}
