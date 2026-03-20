/**
 * Transforms a BoardAIPlan from AI into a Board-compatible structure.
 * Always collapses to a single sheet even if the AI returned multiple.
 */

import type { Board, BoardColumn } from '../../types'
import type { BoardAIPlan } from '../../hooks/useBoardAI'

const PRIMARY_NAMES = ['name', 'title', 'displayName', 'label', 'subject', 'taskName', 'itemName']

export function transformAIPlanToBoard(plan: BoardAIPlan): Partial<Board> {
  const collapsed = collapseToSingleSheet(plan)

  return {
    name: collapsed.suggestedName || 'AI Board',
    sheets: collapsed.sheets.map((s, idx) => {
      const columns = buildColumns(s.columns || [])
      return {
        id: '',
        name: s.name || `Sheet ${idx + 1}`,
        position: idx,
        columns,
        views: buildViews(s.views || [], columns),
        groups: (s.groups || []).map((g, gi) => ({
          id: `grp_${gi}`,
          name: (g.name as string) || `Group ${gi + 1}`,
          order: gi,
          colorToken: g.colorToken as string | undefined
        })),
        settings: {
          allowAdd: true,
          allowEdit: true,
          allowDelete: true,
          allowExport: true,
          allowImport: true,
          rowsPerPage: 50,
          showRowNumbers: false
        }
      }
    })
  }
}

/**
 * If the AI returned multiple sheets, merge columns from sheets 2+ into
 * the first sheet (deduplicating by name). Views stay from sheet 1 only
 * since they reference its columns.
 */
function collapseToSingleSheet(plan: BoardAIPlan): BoardAIPlan {
  if (plan.sheets.length <= 1) return plan

  const primary = plan.sheets[0]
  const existingNames = new Set((primary.columns || []).map(c => (c.name as string) || ''))

  for (let i = 1; i < plan.sheets.length; i++) {
    for (const col of plan.sheets[i].columns || []) {
      const colName = (col.name as string) || ''
      if (colName && !existingNames.has(colName)) {
        primary.columns = [...(primary.columns || []), col]
        existingNames.add(colName)
      }
    }
  }

  return { ...plan, sheets: [primary] }
}

function buildColumns(cols: Partial<BoardColumn>[]): Partial<BoardColumn>[] {
  const mapped: Partial<BoardColumn>[] = cols.map((c, ci) => ({
    id: `col_${ci}`,
    name: (c.name as string) || `col_${ci}`,
    label: (c.label as string) || (c.name as string) || `Column ${ci + 1}`,
    type: (c.type as string) || 'text',
    isVisible: true,
    isEditable: true,
    isRequired: c.isRequired || false,
    isUnique: false,
    order: ci,
    selectOptions: c.selectOptions as Array<{ value: string; label: string; colorToken?: string }> | undefined
  }))

  const primary =
    mapped.find(c => PRIMARY_NAMES.includes(c.name || '')) || mapped.find(c => c.type === 'text') || mapped[0]
  if (primary) primary.isPrimary = true

  return mapped
}

const SUPPORTED_VIEW_TYPES = new Set(['table', 'kanban', 'calendar', 'timeline', 'form', 'dashboard'])
const STATUS_TYPES = new Set(['status', 'priority', 'select', 'multiselect'])
const DATE_TYPES = new Set(['date', 'datetime'])

function buildViews(
  views: Array<{ name?: unknown; type?: unknown; config?: unknown }>,
  columns: Partial<BoardColumn>[]
) {
  const hasStatusCol = columns.some(c => STATUS_TYPES.has(c.type as string))
  const dateColumns = columns.filter(c => DATE_TYPES.has(c.type as string))
  const hasDateCol = dateColumns.length >= 1
  const hasTwoDates = dateColumns.length >= 2

  const firstStatusCol = columns.find(c => STATUS_TYPES.has(c.type as string))?.name
  const firstDateCol = dateColumns[0]?.name
  const secondDateCol = dateColumns[1]?.name
  const primaryCol = columns.find(c => c.isPrimary)?.name || columns.find(c => c.type === 'text')?.name

  const valid = views
    .filter(v => {
      const t = ((v.type as string) || '').toLowerCase()
      if (!SUPPORTED_VIEW_TYPES.has(t)) return false
      if (typeof v.name !== 'string' || !v.name.trim()) return false
      if (t === 'kanban' && !hasStatusCol) return false
      if (t === 'calendar' && !hasDateCol) return false
      if (t === 'timeline' && !hasTwoDates) return false
      return true
    })
    .map((v, vi) => {
      const t = ((v.type as string) || '').toLowerCase()
      let config = (v.config || { type: t }) as Record<string, unknown>

      if (t === 'kanban' && firstStatusCol) {
        config = {
          ...config,
          type: 'kanban',
          statusColumn: config.statusColumn || firstStatusCol,
          titleColumn: config.titleColumn || primaryCol
        }
      } else if (t === 'calendar' && firstDateCol) {
        config = {
          ...config,
          type: 'calendar',
          dateColumn: config.dateColumn || firstDateCol,
          titleColumn: config.titleColumn || primaryCol
        }
      } else if (t === 'timeline' && firstDateCol && secondDateCol) {
        config = {
          ...config,
          type: 'timeline',
          startDateColumn: config.startDateColumn || firstDateCol,
          endDateColumn: config.endDateColumn || secondDateCol,
          titleColumn: config.titleColumn || primaryCol
        }
      }

      return { id: `view_${vi}`, name: (v.name as string).trim(), type: t, isDefault: false, config }
    })

  if (!valid.some(v => v.type === 'table')) {
    valid.unshift({ id: 'view_default', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } })
  }

  const sorted = [...valid.filter(v => v.type === 'table'), ...valid.filter(v => v.type !== 'table')]
  if (sorted.length > 0) sorted[0].isDefault = true
  return sorted
}
