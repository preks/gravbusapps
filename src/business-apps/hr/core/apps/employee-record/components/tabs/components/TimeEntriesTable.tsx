'use client'

import React from 'react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@newwork/nw-design-system'
import type { TimeEntry } from '../hooks/useTimeTrackingData'

const formatDuration = (mins?: number) => {
  if (!mins || mins <= 0) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m ? ` ${m}m` : ''}`
}

export interface TimeEntriesTableProps {
  entries: TimeEntry[]
  locale: string
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = props => {
  const { entries, locale, pageSize, onPageSizeChange } = props

  const statusToVariant: Record<TimeEntry['status'], any> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'destructive',
    open: 'info'
  }

  return (
    <div data-testid="time-tracking-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Break</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="gba:text-muted-foreground">
                No entries
              </TableCell>
            </TableRow>
          ) : (
            entries.map(e => (
              <TableRow key={e.id} data-testid={`time-tracking-table-row-${e.id}`}>
                <TableCell data-testid={`time-tracking-table-date-cell-${e.id}`}>
                  {new Date(e.dateISO).toLocaleDateString(locale)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-start-cell-${e.id}`}>{e.start ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-end-cell-${e.id}`}>{e.end ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-break-cell-${e.id}`}>
                  {formatDuration(e.breakMinutes)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-total-cell-${e.id}`}>
                  {formatDuration(e.totalMinutes)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-notes-cell-${e.id}`}>{e.notes ?? ''}</TableCell>
                <TableCell data-testid={`time-tracking-table-status-cell-${e.id}`}>
                  <Badge variant={statusToVariant[e.status] as any}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Custom footer with rows-per-page aligned right */}
      <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border gba:pt-4 gba:mt-4">
        <div />
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">Rows per page</span>
          <select
            className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            data-testid="time-tracking-rows-per-page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default TimeEntriesTable
