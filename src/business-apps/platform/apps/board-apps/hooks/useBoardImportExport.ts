/**
 * useBoardImportExport - CSV/Excel import and CSV/Excel/JSON export for boards.
 */

import { useState, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { BoardColumn } from '../types'
import translations from '../_i18n'

export interface UseBoardImportExportReturn {
  isImporting: boolean
  isExporting: boolean
  error: string | null
  importCSV: (
    boardId: string,
    sheetId: string,
    csvText: string,
    columns: BoardColumn[],
    mode?: 'append' | 'replace'
  ) => Promise<{ imported: number } | null>
  importJSON: (
    boardId: string,
    sheetId: string,
    rows: Array<Record<string, unknown>>,
    mode?: 'append' | 'replace'
  ) => Promise<{ imported: number } | null>
  exportJSON: (boardId: string, sheetId: string) => Promise<Array<Record<string, unknown>> | null>
  exportCSV: (boardId: string, sheetId: string, columns: BoardColumn[]) => Promise<string | null>
}

export function useBoardImportExport(accessToken: string): UseBoardImportExportReturn {
  const { t } = useTranslation(translations)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = getDocumentServiceApiUrl()

  const importJSON = useCallback(
    async (
      boardId: string,
      sheetId: string,
      rows: Array<Record<string, unknown>>,
      mode: 'append' | 'replace' = 'append'
    ): Promise<{ imported: number } | null> => {
      setIsImporting(true)
      setError(null)
      try {
        const response = await fetch(`${apiUrl}/boards/${boardId}/sheets/${sheetId}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ rows, mode })
        })
        if (!response.ok) throw new Error(t('error-import-failed'))
        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error-import-failed'))
        return null
      } finally {
        setIsImporting(false)
      }
    },
    [apiUrl, accessToken, t]
  )

  const importCSV = useCallback(
    async (
      boardId: string,
      sheetId: string,
      csvText: string,
      columns: BoardColumn[],
      mode: 'append' | 'replace' = 'append'
    ): Promise<{ imported: number } | null> => {
      const rows = parseCSV(csvText, columns)
      if (rows.length === 0) {
        setError(t('error-import-no-valid-csv'))
        return null
      }
      return importJSON(boardId, sheetId, rows, mode)
    },
    [importJSON]
  )

  const exportJSON = useCallback(
    async (boardId: string, sheetId: string): Promise<Array<Record<string, unknown>> | null> => {
      setIsExporting(true)
      setError(null)
      try {
        const response = await fetch(`${apiUrl}/boards/${boardId}/sheets/${sheetId}/export?format=json`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (!response.ok) throw new Error(t('error-export-failed'))
        const data = await response.json()
        return data.rows || []
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error-export-failed'))
        return null
      } finally {
        setIsExporting(false)
      }
    },
    [apiUrl, accessToken, t]
  )

  const exportCSV = useCallback(
    async (boardId: string, sheetId: string, columns: BoardColumn[]): Promise<string | null> => {
      const rows = await exportJSON(boardId, sheetId)
      if (!rows) return null

      const headers = columns.map(c => c.label).join(',')
      const csvRows = rows.map(row =>
        columns
          .map(c => {
            const val = row[c.name]
            if (val === null || val === undefined) return ''
            const str = String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
          })
          .join(',')
      )
      return [headers, ...csvRows].join('\n')
    },
    [exportJSON]
  )

  return { isImporting, isExporting, error, importCSV, importJSON, exportJSON, exportCSV }
}

function parseCSV(text: string, columns: BoardColumn[]): Array<Record<string, unknown>> {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Array<Record<string, unknown>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, unknown> = {}

    headers.forEach((header, idx) => {
      const col = columns.find(c => c.label === header || c.name === header)
      if (col) {
        row[col.name] = coerceValue(values[idx], col.type)
      }
    })

    if (Object.keys(row).length > 0) rows.push(row)
  }

  return rows
}

function coerceValue(value: string | undefined, type: string): unknown {
  if (!value || value === '') return null
  switch (type) {
    case 'number':
    case 'currency':
    case 'percentage':
    case 'rating':
      return Number(value) || null
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
    default:
      return value
  }
}
