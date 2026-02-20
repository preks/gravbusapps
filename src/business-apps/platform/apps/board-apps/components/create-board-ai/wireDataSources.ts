/**
 * Post-creation wiring: connects selected data sources to a newly created board.
 * - Primary source (role: 'primary'): imports as rows with syncMode 'replace'
 * - Auxiliary sources (role: 'auxiliary'): populate select column options
 *
 * Saves entityDataSource config on the sheet for the primary source
 * so the board shows an active data connection and "Sync now" works correctly.
 */

import { BoardApiService } from '../../services/BoardApiService'
import { getEntityDef, type EntityFieldDef } from '../../queries/entityQueries'
import type { DataSourceSuggestion } from '../../hooks/useBoardAI'
import type { Board, BoardColumn } from '../../types'

export interface WireResult {
  rowsImported: number
  selectColumnsPopulated: number
  errors: string[]
}

export async function wireDataSources(
  board: Board,
  sheetId: string,
  selectedSources: DataSourceSuggestion[],
  importLimit?: number,
  fieldSelections?: Map<string, Set<string>>
): Promise<WireResult> {
  const result: WireResult = { rowsImported: 0, selectColumnsPopulated: 0, errors: [] }

  const primarySource = selectedSources.find(s => s.role === 'primary')
  const auxiliarySources = selectedSources.filter(s => s.role === 'auxiliary')

  if (primarySource) {
    try {
      let fieldDefs: EntityFieldDef[] | undefined
      const selectedKeys = fieldSelections?.get(primarySource.entityType)
      if (selectedKeys && selectedKeys.size > 0) {
        const def = getEntityDef(primarySource.entityType)
        if (def) {
          fieldDefs = def.fields.filter(f => f.key === 'id' || selectedKeys.has(f.key))
        }
      }

      console.log(
        `[wireDS] Primary source: ${primarySource.entityType}, importLimit=${importLimit}, fieldDefs=${fieldDefs?.length ?? 'all'}`
      )

      const syncResult = await BoardApiService.syncFromGraphQL(board.id, sheetId, {
        entity: primarySource.entityType,
        limit: importLimit,
        mode: 'replace',
        autoColumns: true,
        fieldDefs
      })
      if (syncResult) result.rowsImported += syncResult.synced
    } catch (err) {
      result.errors.push(
        `Failed to import ${primarySource.entityType}: ${err instanceof Error ? err.message : 'unknown'}`
      )
    }
  }

  for (const ds of auxiliarySources) {
    if (!ds.targetColumn || !ds.sourceField) continue
    try {
      const popResult = await BoardApiService.populateColumnOptions(
        board.id,
        sheetId,
        ds.entityType,
        ds.sourceField,
        ds.targetColumn,
        0
      )
      if (popResult && popResult.optionCount > 0) result.selectColumnsPopulated++
    } catch (err) {
      result.errors.push(`Failed to populate ${ds.targetColumn}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  if (primarySource && result.rowsImported > 0) {
    try {
      const def = getEntityDef(primarySource.entityType)
      if (def) {
        const auxSources = auxiliarySources
          .filter(s => s.targetColumn && s.sourceField)
          .map(s => {
            const auxDef = getEntityDef(s.entityType)
            return {
              entityType: s.entityType,
              entityDisplayName: auxDef?.displayName || s.entityType,
              targetColumn: s.targetColumn,
              sourceField: s.sourceField
            }
          })

        const dsConfig: Record<string, unknown> = {
          id: `ds-ai-${primarySource.entityType}-${Date.now()}`,
          enabled: true,
          entityType: primarySource.entityType,
          entityDisplayName: def.displayName,
          filters: { id: 'root', logic: 'AND', conditions: [] },
          orderBy: [],
          limit: importLimit || 0,
          fieldMappings: def.fields
            .filter(f => {
              const sel = fieldSelections?.get(primarySource.entityType)
              return sel ? sel.has(f.key) : f.defaultVisible
            })
            .map(f => ({
              entityField: f.key,
              entityFieldLabel: f.label,
              entityFieldType: f.type,
              columnId: f.key,
              include: true
            })),
          refreshMode: 'manual',
          syncMode: 'replace',
          mergeStrategy: 'addRows',
          lastSyncAt: new Date().toISOString(),
          lastSyncCount: result.rowsImported,
          auxiliarySources: auxSources.length > 0 ? auxSources : undefined
        }
        const sheetUpdate: Record<string, unknown> = { entityDataSource: dsConfig }
        await BoardApiService.updateSheet(board.id, sheetId, sheetUpdate)
      }
    } catch {
      result.errors.push('Data imported but connection metadata could not be saved')
    }
  }

  await revalidateViews(board.id, sheetId)

  return result
}

const STATUS_COL_TYPES = new Set(['status', 'select', 'multiselect'])
const DATE_COL_TYPES = new Set(['date', 'datetime'])

async function revalidateViews(boardId: string, sheetId: string) {
  try {
    const sheet = await BoardApiService.getSheet(boardId, sheetId)
    if (!sheet?.views || !sheet.columns) return

    const cols = sheet.columns as BoardColumn[]
    const hasStatus = cols.some(c => STATUS_COL_TYPES.has(c.type))
    const dateCols = cols.filter(c => DATE_COL_TYPES.has(c.type))
    const firstStatusCol = cols.find(c => STATUS_COL_TYPES.has(c.type))?.name
    const firstDateCol = dateCols[0]?.name

    const validViews = (sheet.views as Array<Record<string, unknown>>)
      .filter(v => {
        const t = v.type as string
        if (t === 'table' || t === 'form' || t === 'dashboard') return true
        if (t === 'kanban') return hasStatus
        if (t === 'calendar') return dateCols.length >= 1
        if (t === 'timeline') return dateCols.length >= 2
        return false
      })
      .map(v => {
        const t = v.type as string
        const config = (v.config || {}) as Record<string, unknown>
        if (t === 'kanban' && firstStatusCol) {
          return { ...v, config: { ...config, statusColumn: firstStatusCol } }
        }
        if (t === 'calendar' && firstDateCol) {
          return { ...v, config: { ...config, dateColumn: firstDateCol } }
        }
        return v
      })

    if (validViews.length !== (sheet.views as unknown[]).length) {
      await BoardApiService.updateSheet(boardId, sheetId, { views: validViews })
    }
  } catch {
    /* non-critical */
  }
}
