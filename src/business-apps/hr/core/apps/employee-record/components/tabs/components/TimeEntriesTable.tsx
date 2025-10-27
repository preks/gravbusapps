'use client'

import React from 'react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@newwork/nw-design-system'
import type { TimeEntry } from '../hooks/useTimeTrackingData'

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

  const statusToVariant: Record<string, any> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'destructive',
    open: 'info'
  }

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '-'

  return (
    <div data-testid="time-tracking-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Recorded</TableHead>
            <TableHead>Break</TableHead>
            <TableHead>Effective</TableHead>
            <TableHead>Planned</TableHead>
            <TableHead>Diff</TableHead>
            <TableHead>Manual</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="gba:text-muted-foreground">
                No entries
              </TableCell>
            </TableRow>
          ) : (
            entries.map(e => (
              <TableRow key={e.id} data-testid={`time-tracking-table-row-${e.id}`}>
                <TableCell data-testid={`time-tracking-table-date-cell-${e.id}`}>
                  {new Date(e.attendanceDateISO).toLocaleDateString(locale)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-start-cell-${e.id}`}>
                  {formatTime(e.startTimeISO)}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-end-cell-${e.id}`}>{formatTime(e.endTimeISO)}</TableCell>
                <TableCell data-testid={`time-tracking-table-recorded-cell-${e.id}`}>{e.recordedTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-break-cell-${e.id}`}>{e.breakTime ?? '0h'}</TableCell>
                <TableCell data-testid={`time-tracking-table-effective-cell-${e.id}`}>
                  {e.effectiveTime ?? '-'}
                </TableCell>
                <TableCell data-testid={`time-tracking-table-planned-cell-${e.id}`}>{e.plannedTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-diff-cell-${e.id}`}>{e.differenceTime ?? '-'}</TableCell>
                <TableCell data-testid={`time-tracking-table-manual-cell-${e.id}`}>
                  <Badge variant={e.manualOverride ? 'warning' : 'secondary'}>{e.manualOverride ? 'Yes' : 'No'}</Badge>
                </TableCell>
                <TableCell data-testid={`time-tracking-table-notes-cell-${e.id}`}>{e.notes ?? ''}</TableCell>
                <TableCell data-testid={`time-tracking-table-status-cell-${e.id}`}>
                  {e.status ? (
                    <Badge variant={statusToVariant[e.status] || 'info'}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </Badge>
                  ) : (
                    '-'
                  )}
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
