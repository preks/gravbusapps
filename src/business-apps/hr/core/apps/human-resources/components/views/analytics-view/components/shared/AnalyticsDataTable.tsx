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
}: AnalyticsDataTableProps<T>) {
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
                    const defaultDisplay = rawValue === null || rawValue === undefined ? '-' : String(rawValue)
                    const content = renderCell ? renderCell(row, col, index) : defaultDisplay
                    const displayContent = content !== undefined && content !== null ? content : defaultDisplay

                    if (col.badge === HIGHLIGHT_BADGE) {
                      return (
                        <TableCell key={`${col.key}-${index}`}>
                          <Badge variant="outline" className="gba:bg-info-secondary gba:text-info-secondary-foreground">
                            {displayContent}
                          </Badge>
                        </TableCell>
                      )
                    }
                    if (col.badge === DIFFERENT_BADGE) {
                      const num = typeof rawValue === 'number' ? rawValue : Number(rawValue)
                      const display =
                        typeof rawValue === 'number' && Number.isFinite(rawValue)
                          ? (rawValue > 0 ? '+' : '') + String(rawValue)
                          : defaultDisplay
                      const variant =
                        Number.isFinite(num) && num > 0 ? 'outline' : num < 0 ? 'destructive' : 'secondary'
                      const className =
                        Number.isFinite(num) && num > 0
                          ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                          : num < 0
                            ? 'gba:bg-destructive/10 gba:text-destructive'
                            : 'gba:bg-muted gba:text-muted-foreground'
                      return (
                        <TableCell key={`${col.key}-${index}`}>
                          <Badge variant={variant} className={className}>
                            {display}
                          </Badge>
                        </TableCell>
                      )
                    }
                    if (col.badge === DIFFERENT_PERCENTAGE_BADGE) {
                      const str = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim()
                      const numStr = str.replace(/%\s*$/, '').replace(/\s/g, '')
                      const num = Number(numStr)
                      const display = defaultDisplay
                      const variant =
                        Number.isFinite(num) && num > 0 ? 'outline' : num < 0 ? 'destructive' : 'secondary'
                      const className =
                        Number.isFinite(num) && num > 0
                          ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                          : num < 0
                            ? 'gba:bg-destructive/10 gba:text-destructive'
                            : 'gba:bg-muted gba:text-muted-foreground'
                      return (
                        <TableCell key={`${col.key}-${index}`}>
                          <Badge variant={variant} className={className}>
                            {display}
                          </Badge>
                        </TableCell>
                      )
                    }

                    return <TableCell key={`${col.key}-${index}`}>{displayContent}</TableCell>
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
