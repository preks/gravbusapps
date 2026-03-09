/**
 * DependencyEditorPanel - side panel for managing a row's predecessor
 * dependencies within the timeline view.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from '@newwork/nw-design-system'
import { X, Link2 } from 'lucide-react'
import type { BoardRow, DependencyType, DependencyMeta } from '../../types'

const DEP_TYPE_OPTIONS: Array<{ value: DependencyType; label: string }> = [
  { value: 'FS', label: 'Finish → Start' },
  { value: 'SS', label: 'Start → Start' },
  { value: 'FF', label: 'Finish → Finish' },
  { value: 'SF', label: 'Start → Finish' }
]

export interface DependencyEditorPanelProps {
  row: BoardRow
  allRows: BoardRow[]
  dependencyColumn: string
  titleColumn: string
  onSave: (rowId: string, predecessorIds: string[], depMeta: DependencyMeta) => void
  onClose: () => void
  'data-testid'?: string
}

export const DependencyEditorPanel: React.FC<DependencyEditorPanelProps> = ({
  row,
  allRows,
  dependencyColumn,
  titleColumn,
  onSave,
  onClose,
  'data-testid': testId = 'dep-editor'
}) => {
  const metaKey = `_dep_${dependencyColumn}`
  const currentIds: string[] = useMemo(() => {
    const val = row.data[dependencyColumn]
    return Array.isArray(val) ? val.filter((id): id is string => typeof id === 'string') : []
  }, [row, dependencyColumn])

  const currentMeta: DependencyMeta = useMemo(() => {
    const val = row.data[metaKey]
    return val && typeof val === 'object' && !Array.isArray(val) ? (val as DependencyMeta) : {}
  }, [row, metaKey])

  const [predIds, setPredIds] = useState<string[]>(currentIds)
  const [depMeta, setDepMeta] = useState<DependencyMeta>(currentMeta)
  const [addingSearch, setAddingSearch] = useState('')

  const rowLabel = useCallback(
    (r: BoardRow) => String(r.data[titleColumn] || r.data['name'] || r.id.slice(0, 8)),
    [titleColumn]
  )

  const candidateRows = useMemo(() => {
    const excluded = new Set([row.id, ...predIds])
    const term = addingSearch.trim().toLowerCase()
    return allRows.filter(r => {
      if (excluded.has(r.id)) return false
      if (!term) return true
      return rowLabel(r).toLowerCase().includes(term)
    })
  }, [allRows, row.id, predIds, addingSearch, rowLabel])

  const handleAddPred = useCallback((predRow: BoardRow) => {
    setPredIds(prev => [...prev, predRow.id])
    setDepMeta(prev => ({ ...prev, [predRow.id]: 'FS' }))
    setAddingSearch('')
  }, [])

  const handleRemovePred = useCallback((predId: string) => {
    setPredIds(prev => prev.filter(id => id !== predId))
    setDepMeta(prev => {
      const next = { ...prev }
      delete next[predId]
      return next
    })
  }, [])

  const handleTypeChange = useCallback((predId: string, type: DependencyType) => {
    setDepMeta(prev => ({ ...prev, [predId]: type }))
  }, [])

  const handleSave = useCallback(() => {
    onSave(row.id, predIds, depMeta)
  }, [row.id, predIds, depMeta, onSave])

  const title = rowLabel(row)

  return (
    <div className="gba:w-72 gba:border-l gba:bg-card gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b">
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
          <Link2 className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:shrink-0" />
          <span className="gba:text-xs gba:font-medium gba:truncate">{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid={`${testId}-close`}>
          <X className="gba:w-3.5 gba:h-3.5" />
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-3 gba:space-y-3">
        <Label className="gba:text-xs gba:text-muted-foreground">Predecessors</Label>

        {predIds.length === 0 && <p className="gba:text-xs gba:text-muted-foreground gba:italic">No predecessors</p>}

        {predIds.map(predId => {
          const predRow = allRows.find(r => r.id === predId)
          const label = predRow ? rowLabel(predRow) : predId.slice(0, 8)
          const currentType = depMeta[predId] || 'FS'
          return (
            <div
              key={predId}
              className="gba:flex gba:items-center gba:gap-2 gba:rounded gba:border gba:px-2 gba:py-1.5"
              data-testid={`${testId}-pred-${predId}`}
            >
              <span className="gba:text-xs gba:flex-1 gba:truncate">{label}</span>
              <Select value={currentType} onValueChange={(v: string) => handleTypeChange(predId, v as DependencyType)}>
                <SelectTrigger
                  className="gba:h-6 gba:text-[10px] gba:w-20 gba:px-1.5"
                  data-testid={`${testId}-type-${predId}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEP_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => handleRemovePred(predId)}
                className="gba:p-0 gba:border-0 gba:bg-transparent gba:cursor-pointer gba:rounded gba:hover:bg-muted"
                data-testid={`${testId}-remove-${predId}`}
              >
                <X className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
              </button>
            </div>
          )
        })}

        <div className="gba:pt-2">
          <Label className="gba:text-xs gba:text-muted-foreground">Add predecessor</Label>
          <input
            value={addingSearch}
            onChange={e => setAddingSearch(e.target.value)}
            placeholder="Search rows..."
            className="gba:w-full gba:h-7 gba:text-xs gba:bg-background gba:border gba:rounded gba:px-2 gba:mt-1 gba:outline-none"
            data-testid={`${testId}-search`}
          />
          {addingSearch.trim() && candidateRows.length > 0 && (
            <div className="gba:border gba:rounded gba:mt-1 gba:max-h-32 gba:overflow-y-auto gba:bg-popover">
              {candidateRows.slice(0, 20).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleAddPred(r)}
                  className="gba:w-full gba:text-left gba:px-2 gba:py-1 gba:text-xs gba:cursor-pointer gba:border-0 gba:bg-transparent gba:hover:bg-muted"
                  data-testid={`${testId}-candidate-${r.id}`}
                >
                  {rowLabel(r)}
                </button>
              ))}
            </div>
          )}
          {addingSearch.trim() && candidateRows.length === 0 && (
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">No matching rows</p>
          )}
        </div>
      </div>

      <div className="gba:flex gba:gap-2 gba:p-3 gba:border-t">
        <Button variant="outline" size="sm" onClick={onClose} className="gba:flex-1" data-testid={`${testId}-cancel`}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} className="gba:flex-1" data-testid={`${testId}-save`}>
          Save
        </Button>
      </div>
    </div>
  )
}
