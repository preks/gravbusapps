import React, { useEffect, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  Badge
} from '@newwork/nw-design-system'
import type { TranslationScope } from '../hooks/useTranslationTree'
import type { UseTranslationFilesResult } from '../hooks/useTranslationFiles'
import { parseFTL, listMessageIds, getMessagePattern, setMessagePattern, getFileMeta } from '../utils/fluent'
import { extractVariablesFromMessage } from '../utils/variableExtractor'
import { EditableTranslationField } from './EditableTranslationField'

type Row = { id: string; patterns: Record<string, any | null>; variables: string[]; needsReview: boolean }

interface TranslationsTableProps {
  scope: TranslationScope
  translationFiles: UseTranslationFilesResult // Already loaded files
  branch: string
  localeFilter?: string // NEW: Optional locale filter
}

const TranslationsTable: React.FC<TranslationsTableProps> = ({ scope, translationFiles, localeFilter = 'all' }) => {
  const [rows, setRows] = useState<Row[]>([])
  const [fileStatus, setFileStatus] = useState<Record<string, string>>({})

  // Get locales for UI (filtered)
  const allLocales = scope.files
    .map(path => {
      const filename = path.split('/').pop() || ''
      return filename.replace('.ftl', '')
    })
    .sort()

  const locales = localeFilter === 'all' ? allLocales : allLocales.filter(l => l === localeFilter)

  useEffect(() => {
    // Build translation rows from ALREADY LOADED files (no re-loading!)
    const keys = new Set<string>()

    // Get all unique message IDs across all locales
    scope.files.forEach(filePath => {
      const file = translationFiles.files.get(filePath)
      if (file) {
        const ids = listMessageIds(file.ast)
        ids.forEach(k => keys.add(k))
      }
    })

    console.log('[TranslationsTable] All unique keys:', Array.from(keys))

    // Build table rows
    const table: Row[] = []
    const allKeys = Array.from(keys).sort()

    for (const id of allKeys) {
      const patterns: Record<string, any | null> = {}
      const allVariables = new Set<string>()

      for (const filePath of scope.files) {
        const file = translationFiles.files.get(filePath)

        if (file) {
          try {
            // Get AST pattern (not string)
            patterns[file.locale] = getMessagePattern(file.ast, id)

            // Extract variables
            const baseId = id.split('[')[0].split('.')[0]
            const vars = extractVariablesFromMessage(file.ast, baseId)
            vars.forEach(v => allVariables.add(v))
          } catch (e) {
            console.error(`[TranslationsTable] Error getting pattern for ${id} in ${file.locale}:`, e)
            patterns[file.locale] = null
          }
        }
      }

      table.push({
        id,
        patterns,
        variables: Array.from(allVariables).sort(),
        needsReview: scope.files.some(filePath => {
          const file = translationFiles.files.get(filePath)
          return file?.needsReview || false
        })
      })
    }

    console.log('[TranslationsTable] Final rows:', table.length)
    setRows(table)

    // Load file statuses
    const fileStatuses: Record<string, string> = {}
    scope.files.forEach(filePath => {
      const file = translationFiles.files.get(filePath)
      if (file) {
        const meta = getFileMeta(file.ast)
        fileStatuses[file.locale] = meta?.status || 'approved'
      }
    })
    setFileStatus(fileStatuses)
  }, [scope, translationFiles.files, localeFilter])

  const setCell = (id: string, locale: string, newPattern: any) => {
    // Update row in state
    setRows(rs => rs.map(r => (r.id === id ? { ...r, patterns: { ...r.patterns, [locale]: newPattern } } : r)))

    // Find the file for this locale and update its AST in translationFiles
    const filePath = scope.files.find(p => p.includes(`${locale}.ftl`))
    if (filePath) {
      const file = translationFiles.files.get(filePath)
      if (file) {
        const updatedAST = parseFTL(file.content)
        setMessagePattern(updatedAST, id, newPattern)
        translationFiles.updateFileAST(filePath, updatedAST)
      }
    }
  }

  const save = async () => {
    // TODO: Implement save using translationFiles.saveFile
    console.warn('[TranslationsTable] Save not yet implemented with new hook structure')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Übersetzungen – <code className="gba:text-sm">{scope.path.replace('src/business-apps/', '')}</code>
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <p className="gba:text-sm gba:text-muted-foreground">
          Datei-Status pro Locale (kein per-Key Flag). Komplexe Selektoren bleiben erhalten.
        </p>

        <div className="gba:flex gba:gap-3 gba:flex-wrap">
          {locales.map(lc => (
            <div
              key={lc}
              className="gba:flex gba:items-center gba:gap-2 gba:bg-muted gba:px-3 gba:py-1.5 gba:rounded-md"
            >
              <span className="gba:text-sm gba:font-medium">{lc}:</span>
              <Select value={fileStatus[lc] || 'approved'} onValueChange={v => setFileStatus(s => ({ ...s, [lc]: v }))}>
                <SelectTrigger className="gba:h-7 gba:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">proposed</SelectItem>
                  <SelectItem value="approved">approved</SelectItem>
                  <SelectItem value="deprecated">deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="gba:overflow-x-auto gba:border gba:rounded-lg">
          {translationFiles.isLoading ? (
            <div className="gba:p-4 gba:space-y-3">
              <Skeleton className="gba:h-8 gba:w-full" />
              <Skeleton className="gba:h-20 gba:w-full" />
              <Skeleton className="gba:h-20 gba:w-full" />
              <Skeleton className="gba:h-20 gba:w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  {locales.map(lc => (
                    <TableHead key={lc}>{lc}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <code className="gba:text-xs">{r.id}</code>
                      </TableCell>
                      {locales.map(lc => {
                        const file = translationFiles.files.get(scope.files.find(f => f.includes(`${lc}.ftl`)) || '')
                        const needsReview = file?.needsReview || false
                        const isKeyInReviewedKeys = file?.meta?.reviewedKeys?.includes(r.id) || false

                        return (
                          <TableCell key={lc}>
                            <div className="gba:space-y-2">
                              {/* Status badges per translation */}
                              <div className="gba:flex gba:gap-1 gba:mb-1">
                                {needsReview && (
                                  <Badge variant="warning" className="gba:text-xs gba:px-1.5 gba:py-0">
                                    Review
                                  </Badge>
                                )}
                                {isKeyInReviewedKeys && (
                                  <Badge variant="success" className="gba:text-xs gba:px-1.5 gba:py-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              {/* Editable field */}
                              <EditableTranslationField
                                value={r.patterns[lc]}
                                onChange={newPattern => setCell(r.id, lc, newPattern)}
                                availableVariables={r.variables}
                              />
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="gba:flex gba:gap-2">
          <Button onClick={save}>Als Vorschlag (PR) speichern</Button>
          <Button onClick={save} variant="secondary">
            Direkt anwenden (PR) speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default TranslationsTable
