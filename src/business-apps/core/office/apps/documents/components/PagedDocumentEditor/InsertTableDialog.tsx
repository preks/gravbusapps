/**
 * Insert table dialog: set number of rows and columns.
 */

import React, { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { PageLayoutPaginationConfig } from '../../utils/pageLayoutUtils'
import { insertWordLikeTable } from '../../utils/initialInsertedTableLayout'

const MIN_ROWS = 1
const MAX_ROWS = 30
const MIN_COLS = 1
const MAX_COLS = 20
const DEFAULT_ROWS = 3
const DEFAULT_COLS = 3

export interface InsertTableDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly editor: Editor | null
  readonly paginationConfig: PageLayoutPaginationConfig | null
  readonly 'data-testid'?: string
}

export function InsertTableDialog({
  open,
  onOpenChange,
  editor,
  paginationConfig,
  'data-testid': testId = 'document-insert-table-dialog'
}: InsertTableDialogProps) {
  const { t } = useTranslation(translations)
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [cols, setCols] = useState(DEFAULT_COLS)
  const [rowsError, setRowsError] = useState<string | null>(null)
  const [colsError, setColsError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setRows(DEFAULT_ROWS)
      setCols(DEFAULT_COLS)
      setRowsError(null)
      setColsError(null)
    }
  }, [open])

  const clamp = useCallback((value: number, min: number, max: number) => {
    const n = Math.floor(value)
    if (Number.isNaN(n)) return min
    return Math.min(Math.max(n, min), max)
  }, [])

  const handleRowsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (raw === '') {
        setRows(DEFAULT_ROWS)
        setRowsError(null)
        return
      }
      const n = Number.parseInt(raw, 10)
      if (Number.isNaN(n) || n < MIN_ROWS || n > MAX_ROWS) {
        setRowsError(t('insert-table-dialog-rows-range', { min: MIN_ROWS, max: MAX_ROWS }))
        setRows(Number.isNaN(n) ? DEFAULT_ROWS : clamp(n, MIN_ROWS, MAX_ROWS))
      } else {
        setRowsError(null)
        setRows(n)
      }
    },
    [t, clamp]
  )

  const handleColsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (raw === '') {
        setCols(DEFAULT_COLS)
        setColsError(null)
        return
      }
      const n = Number.parseInt(raw, 10)
      if (Number.isNaN(n) || n < MIN_COLS || n > MAX_COLS) {
        setColsError(t('insert-table-dialog-cols-range', { min: MIN_COLS, max: MAX_COLS }))
        setCols(Number.isNaN(n) ? DEFAULT_COLS : clamp(n, MIN_COLS, MAX_COLS))
      } else {
        setColsError(null)
        setCols(n)
      }
    },
    [t, clamp]
  )

  const handleInsert = useCallback(() => {
    const r = clamp(rows, MIN_ROWS, MAX_ROWS)
    const c = clamp(cols, MIN_COLS, MAX_COLS)
    if (r < MIN_ROWS || r > MAX_ROWS) {
      setRowsError(t('insert-table-dialog-rows-range', { min: MIN_ROWS, max: MAX_ROWS }))
      return
    }
    if (c < MIN_COLS || c > MAX_COLS) {
      setColsError(t('insert-table-dialog-cols-range', { min: MIN_COLS, max: MAX_COLS }))
      return
    }
    setRowsError(null)
    setColsError(null)
    if (!editor) {
      return
    }

    insertWordLikeTable({
      editor,
      paginationConfig,
      rows: r,
      cols: c,
      withHeaderRow: false
    })
    onOpenChange(false)
  }, [clamp, cols, editor, onOpenChange, paginationConfig, rows, t])

  const handleCancel = useCallback(() => {
    setRowsError(null)
    setColsError(null)
    onOpenChange(false)
  }, [onOpenChange])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setRowsError(null)
        setColsError(null)
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  if (!editor) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle data-testid="insert-table-dialog-title">{t('insert-table-dialog-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:pt-2">
          <div className="gba:space-y-2">
            <Label htmlFor="insert-table-rows">{t('insert-table-dialog-rows')}</Label>
            <Input
              id="insert-table-rows"
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              value={rows}
              onChange={handleRowsChange}
              data-testid="insert-table-dialog-rows"
              className="gba:w-full"
            />
            {rowsError && (
              <p className="gba:text-sm gba:text-destructive" role="alert" data-testid="insert-table-dialog-rows-error">
                {rowsError}
              </p>
            )}
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="insert-table-cols">{t('insert-table-dialog-cols')}</Label>
            <Input
              id="insert-table-cols"
              type="number"
              min={MIN_COLS}
              max={MAX_COLS}
              value={cols}
              onChange={handleColsChange}
              data-testid="insert-table-dialog-cols"
              className="gba:w-full"
            />
            {colsError && (
              <p className="gba:text-sm gba:text-destructive" role="alert" data-testid="insert-table-dialog-cols-error">
                {colsError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="insert-table-dialog-cancel">
            {t('insert-table-dialog-cancel')}
          </Button>
          <Button onClick={handleInsert} data-testid="insert-table-dialog-insert">
            {t('insert-table-dialog-insert')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
