import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { PiFilePdf, PiFileText } from 'react-icons/pi'

/** Blue pill for percentages/rates. */
export const HIGHLIGHT_BADGE = 'highlight' as const
/** Green (positive), red (negative), grey (zero) for change columns (numeric values). */
export const DIFFERENT_BADGE = 'different' as const
/** Same as DIFFERENT_BADGE but for percentage strings (e.g. "+46.4%"): strip % and parse number for color, display original text. */
export const DIFFERENT_PERCENTAGE_BADGE = 'different-percentage' as const

export type ColumnBadge = typeof HIGHLIGHT_BADGE | typeof DIFFERENT_BADGE | typeof DIFFERENT_PERCENTAGE_BADGE

export interface AnalyticsDataTableColumn {
  key: string
  header: string
  /** Optional badge style for this column. */
  badge?: ColumnBadge
}

interface AnalyticsDataTableProps<T> {
  dataTestId: string
  className?: string
  title: string
  description?: string
  entriesText: string
  columns: AnalyticsDataTableColumn[]
  rows: T[]
  exportingFormat?: 'excel' | 'pdf' | null
  onExport?: (format: 'excel' | 'pdf') => void
  exportExcelTestId?: string
  exportPdfTestId?: string
  exportExcelLabel?: string
  exportPdfLabel?: string
  getRowKey?: (row: T, index: number) => string
  renderCell?: (row: T, column: AnalyticsDataTableColumn, index: number) => React.ReactNode
  footer?: React.ReactNode
}

type BadgeTone = {
  variant: 'outline' | 'destructive' | 'secondary'
  className: string
}

const POSITIVE_BADGE_TONE: BadgeTone = {
  variant: 'outline',
  className: 'gba:bg-success-secondary gba:text-success-secondary-foreground'
}
const NEGATIVE_BADGE_TONE: BadgeTone = {
  variant: 'destructive',
  className: 'gba:bg-destructive/10 gba:text-destructive'
}
const NEUTRAL_BADGE_TONE: BadgeTone = {
  variant: 'secondary',
  className: 'gba:bg-muted gba:text-muted-foreground'
}

const toDisplayString = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '-'
    }
  }
  return String(value)
}

const getToneForNumber = (num: number): BadgeTone => {
  if (Number.isFinite(num) && num > 0) return POSITIVE_BADGE_TONE
  if (num < 0) return NEGATIVE_BADGE_TONE
  return NEUTRAL_BADGE_TONE
}

const parsePercentageLikeNumber = (value: unknown): number => {
  const str = toDisplayString(value).trim()
  if (!str || str === '-') return Number.NaN
  const compact = str.split(' ').join('')
  const numStr = compact.endsWith('%') ? compact.slice(0, -1) : compact
  return Number(numStr)
}

function renderBadgeCell(
  badge: ColumnBadge,
  rawValue: unknown,
  displayContent: React.ReactNode,
  key: string
): React.ReactElement {
  if (badge === HIGHLIGHT_BADGE) {
    return (
      <TableCell key={key}>
        <Badge variant="outline" className="gba:bg-info-secondary gba:text-info-secondary-foreground">
          {displayContent}
        </Badge>
      </TableCell>
    )
  }

  if (badge === DIFFERENT_BADGE) {
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    const tone = getToneForNumber(numericValue)
    const display =
      typeof rawValue === 'number' && Number.isFinite(rawValue)
        ? `${rawValue > 0 ? '+' : ''}${rawValue}`
        : toDisplayString(rawValue)
    return (
      <TableCell key={key}>
        <Badge variant={tone.variant} className={tone.className}>
          {display}
        </Badge>
      </TableCell>
    )
  }

  const numericValue = parsePercentageLikeNumber(rawValue)
  const tone = getToneForNumber(numericValue)
  return (
    <TableCell key={key}>
      <Badge variant={tone.variant} className={tone.className}>
        {toDisplayString(rawValue)}
      </Badge>
    </TableCell>
  )
}

export function AnalyticsDataTable<T>({
  dataTestId,
  className,
  title,
  description,
  entriesText,
  columns,
  rows,
  exportingFormat = null,
  onExport,
  exportExcelTestId,
  exportPdfTestId,
  exportExcelLabel = 'Export Excel',
  exportPdfLabel = 'Export PDF',
  getRowKey,
  renderCell,
  footer
}: Readonly<AnalyticsDataTableProps<T>>) {
  return (
    <Card data-testid={dataTestId} className={className}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <CardTitle className="gba:text-xl">{title}</CardTitle>
            <Badge variant="outline" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
              {entriesText}
            </Badge>
          </div>
          {onExport && (
            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid={exportExcelTestId}
                disabled={exportingFormat === 'excel'}
                onClick={() => onExport('excel')}
                className="gba:flex gba:items-center gba:gap-1"
              >
                <PiFileText className="gba:w-3 gba:h-3" />
                {exportExcelLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                data-testid={exportPdfTestId}
                disabled={exportingFormat === 'pdf'}
                onClick={() => onExport('pdf')}
                className="gba:flex gba:items-center gba:gap-1"
              >
                <PiFilePdf className="gba:w-3 gba:h-3" />
                {exportPdfLabel}
              </Button>
            </div>
          )}
        </div>
        {description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="gba:max-h-96 gba:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.key}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={getRowKey ? getRowKey(row, index) : `${index}`}>
                  {columns.map(col => {
                    const rawValue = (row as unknown as Record<string, unknown>)[col.key]
                    const defaultDisplay = toDisplayString(rawValue)
                    const content = renderCell ? renderCell(row, col, index) : defaultDisplay
                    const displayContent = content ?? defaultDisplay
                    const cellKey = `${col.key}-${index}`
                    if (col.badge) return renderBadgeCell(col.badge, rawValue, displayContent, cellKey)

                    return <TableCell key={cellKey}>{displayContent}</TableCell>
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {footer}
      </CardContent>
    </Card>
  )
}

export default AnalyticsDataTable
