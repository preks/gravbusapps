import React, { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Badge,
  Spinner,
  Checkbox,
  Label
} from '@newwork/nw-design-system'
import { Download, Upload, FileText, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { ColumnDefinition, SpreadsheetRow } from '../types'

interface ImportExportDialogProps {
  open: boolean
  onClose: () => void
  columns: ColumnDefinition[]
  rows: SpreadsheetRow[]
  onImport: (rows: Record<string, any>[]) => Promise<void>
  'data-testid'?: string
}

/**
 * Import/Export Dialog for CSV data
 */
export const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  open,
  onClose,
  columns,
  rows,
  onImport,
  'data-testid': testId = 'import-export-dialog'
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [isProcessing, setIsProcessing] = useState(false)
  const [importData, setImportData] = useState<Record<string, any>[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert rows to CSV
  const generateCSV = useCallback((): string => {
    const headers = columns.map(col => col.name)
    const headerLabels = columns.map(col => col.label)

    const lines: string[] = []

    if (includeHeaders) {
      lines.push(headerLabels.map(h => `"${h.replaceAll('"', '""')}"`).join(','))
    }

    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row.values[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') return `"${value.replaceAll('"', '""')}"`
        if (Array.isArray(value)) return `"${value.join(';').replaceAll('"', '""')}"`
        return String(value)
      })
      lines.push(values.join(','))
    })

    return lines.join('\n')
  }, [columns, rows, includeHeaders])

  // Export to CSV file
  const handleExport = useCallback(() => {
    const csv = generateCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [generateCSV])

  // Parse CSV file
  const parseCSV = useCallback(
    (content: string): Record<string, any>[] => {
      const lines = content.split(/\r?\n/).filter(line => line.trim())
      if (lines.length === 0) return []

      // Parse header
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        let i = 0
        while (i < line.length) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"'
              i += 2 // Skip both quotes
              continue
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
          i++
        }
        result.push(current.trim())
        return result
      }

      // Assume first line is header
      const headerLine = parseCSVLine(lines[0])

      // Map header labels to column names
      const headerMap: Record<number, string> = {}
      headerLine.forEach((label, index) => {
        const col = columns.find(
          c => c.label.toLowerCase() === label.toLowerCase() || c.name.toLowerCase() === label.toLowerCase()
        )
        if (col) {
          headerMap[index] = col.name
        }
      })

      // Parse data rows
      const data: Record<string, any>[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row: Record<string, any> = {}

        values.forEach((value, index) => {
          const colName = headerMap[index]
          if (colName) {
            const col = columns.find(c => c.name === colName)
            if (col) {
              // Type conversion
              if (value === '') {
                row[colName] = null
              } else if (col.type === 'NUMBER') {
                row[colName] = Number(value) || 0
              } else if (col.type === 'CHECKBOX') {
                row[colName] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
              } else if (col.type === 'MULTISELECT') {
                row[colName] = value
                  .split(';')
                  .map(v => v.trim())
                  .filter(Boolean)
              } else {
                row[colName] = value
              }
            }
          }
        })

        // Only add rows with at least one value
        if (Object.keys(row).length > 0) {
          data.push(row)
        }
      }

      return data
    },
    [columns]
  )

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setImportError(null)
      setImportSuccess(false)

      try {
        const content = await file.text()
        const parsed = parseCSV(content)
        setImportData(parsed)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to read or parse CSV file')
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [parseCSV]
  )

  // Execute import
  const handleImport = useCallback(async () => {
    if (importData.length === 0) return

    setIsProcessing(true)
    setImportError(null)

    try {
      await onImport(importData)
      setImportSuccess(true)
      setImportData([])
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setIsProcessing(false)
    }
  }, [importData, onImport])

  // Download template
  const handleDownloadTemplate = useCallback(() => {
    const headers = columns.map(col => `"${col.label.replaceAll('"', '""')}"`).join(',')
    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [columns])

  const resetState = useCallback(() => {
    setImportData([])
    setImportError(null)
    setImportSuccess(false)
    setActiveTab('export')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FileSpreadsheet className="gba:h-5 gba:w-5" />
            Import / Export Data
          </DialogTitle>
          <DialogDescription>Export your data to CSV or import data from a CSV file</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'export' | 'import')}>
          <TabsList className="gba:grid gba:grid-cols-2">
            <TabsTrigger value="export" className="gba:flex gba:items-center gba:gap-1">
              <Download className="gba:h-4 gba:w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gba:flex gba:items-center gba:gap-1">
              <Upload className="gba:h-4 gba:w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="gba:space-y-4 gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id="include-headers"
                checked={includeHeaders}
                onCheckedChange={checked => setIncludeHeaders(!!checked)}
              />
              <Label htmlFor="include-headers" className="gba:cursor-pointer">
                Include column headers
              </Label>
            </div>

            <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <span className="gba:text-sm gba:font-medium">Export Summary</span>
                <Badge variant="secondary">{rows.length} rows</Badge>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground">
                Exporting {columns.length} columns: {columns.map(c => c.label).join(', ')}
              </p>
            </div>

            <Button
              onClick={handleExport}
              disabled={rows.length === 0}
              className="gba:w-full"
              data-testid={`${testId}-export-btn`}
            >
              <Download className="gba:h-4 gba:w-4 gba:mr-2" />
              Download CSV
            </Button>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="gba:space-y-4 gba:pt-4">
            {importSuccess ? (
              <Alert className="gba:bg-success-secondary gba:border-success">
                <Check className="gba:h-4 gba:w-4 gba:text-success" />
                <AlertDescription className="gba:text-success-secondary-foreground">
                  Successfully imported data. Close this dialog to see the results.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <button
                  type="button"
                  className="gba:w-full gba:border-2 gba:border-dashed gba:border-border gba:rounded-lg gba:p-6 gba:text-center gba:hover:border-primary gba:cursor-pointer gba:transition-colors gba:bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid={`${testId}-upload-area`}
                >
                  <Upload className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
                  <p className="gba:text-sm gba:font-medium">Click to upload CSV file</p>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">or drag and drop</p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="gba:hidden"
                  data-testid={`${testId}-file-input`}
                />

                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gba:w-full">
                  <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
                  Download Template
                </Button>

                {importError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="gba:h-4 gba:w-4" />
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}

                {importData.length > 0 && (
                  <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span className="gba:text-sm gba:font-medium">Ready to Import</span>
                      <Badge variant="info">{importData.length} rows</Badge>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Preview:{' '}
                      {importData
                        .slice(0, 3)
                        .map(row => Object.values(row)[0])
                        .join(', ')}
                      {importData.length > 3 && '...'}
                    </p>
                  </div>
                )}
              </>
            )}

            {!importSuccess && (
              <Button
                onClick={handleImport}
                disabled={importData.length === 0 || isProcessing}
                className="gba:w-full"
                data-testid={`${testId}-import-btn`}
              >
                {isProcessing ? (
                  <>
                    <Spinner size="sm" className="gba:mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
                    Import {importData.length} Rows
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
