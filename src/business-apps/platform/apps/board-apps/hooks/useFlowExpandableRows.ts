import { useCallback, useState } from 'react'
import type { BoardRow } from '../types'
import type { FlowProgressStep } from '../services/flowEngine'
import { getFlowProgressComplete } from '../services/flowEngine'

export interface FlowSubRow {
  id: string
  parentRowId: string
  step: FlowProgressStep
}

interface ExpandedState {
  isLoading: boolean
  subRows: FlowSubRow[]
}

export function useFlowExpandableRows() {
  const [expandedMap, setExpandedMap] = useState<Map<string, ExpandedState>>(new Map())

  const isExpanded = useCallback((rowId: string) => expandedMap.has(rowId), [expandedMap])
  const getSubRows = useCallback((rowId: string) => expandedMap.get(rowId), [expandedMap])

  const toggleExpand = useCallback(
    async (row: BoardRow) => {
      const rowId = row.id
      if (expandedMap.has(rowId)) {
        setExpandedMap(prev => {
          const next = new Map(prev)
          next.delete(rowId)
          return next
        })
        return
      }

      const flowId = row.data.flowId
      if (!flowId || typeof flowId !== 'string') return

      setExpandedMap(prev => new Map(prev).set(rowId, { isLoading: true, subRows: [] }))

      const progress = await getFlowProgressComplete(flowId)
      const subRows: FlowSubRow[] = (progress?.steps ?? []).map((step, idx) => ({
        id: `${rowId}_step_${idx}`,
        parentRowId: rowId,
        step
      }))

      setExpandedMap(prev => new Map(prev).set(rowId, { isLoading: false, subRows }))
    },
    [expandedMap]
  )

  const collapseAll = useCallback(() => setExpandedMap(new Map()), [])

  return { isExpanded, getSubRows, toggleExpand, collapseAll }
}
