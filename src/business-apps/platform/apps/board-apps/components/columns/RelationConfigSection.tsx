import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import type { BoardColumn } from '../../types'

interface BoardInfo {
  id: string
  name: string
  sheets: Array<{ id: string; name: string; columns: Array<{ id: string; name: string; label: string }> }>
}

export interface RelationConfigSectionProps {
  column: BoardColumn
  boards: BoardInfo[]
  allColumns: BoardColumn[]
  onPatch: (updates: Partial<BoardColumn>) => void
  testId: string
}

export const RelationConfigSection: React.FC<RelationConfigSectionProps> = ({
  column,
  boards,
  allColumns,
  onPatch,
  testId
}) => {
  const targetSheets = boards.find(b => b.id === column.relationConfig?.targetAppId)?.sheets || []
  const targetColumns = targetSheets.find(s => s.id === column.relationConfig?.targetSheetId)?.columns || []
  const relationColumns = allColumns.filter(c => c.type === 'relation')

  if (column.type === 'relation') {
    return (
      <div className="gba:space-y-3 gba:border gba:rounded-md gba:p-3">
        <div className="gba:text-xs gba:font-medium">Relation target</div>
        <div>
          <Label className="gba:text-xs">Board</Label>
          <Select
            value={column.relationConfig?.targetAppId || ''}
            onValueChange={v =>
              onPatch({
                relationConfig: { ...column.relationConfig!, targetAppId: v, targetSheetId: '', displayColumn: '' }
              })
            }
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rel-board`}>
              <SelectValue placeholder="Pick board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {targetSheets.length > 0 && (
          <div>
            <Label className="gba:text-xs">Sheet</Label>
            <Select
              value={column.relationConfig?.targetSheetId || ''}
              onValueChange={v =>
                onPatch({ relationConfig: { ...column.relationConfig!, targetSheetId: v, displayColumn: '' } })
              }
            >
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rel-sheet`}>
                <SelectValue placeholder="Pick sheet" />
              </SelectTrigger>
              <SelectContent>
                {targetSheets.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {targetColumns.length > 0 && (
          <div>
            <Label className="gba:text-xs">Display column</Label>
            <Select
              value={column.relationConfig?.displayColumn || ''}
              onValueChange={v => onPatch({ relationConfig: { ...column.relationConfig!, displayColumn: v } })}
            >
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rel-display`}>
                <SelectValue placeholder="Pick column" />
              </SelectTrigger>
              <SelectContent>
                {targetColumns.map(c => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="gba:text-xs">Cardinality</Label>
          <Select
            value={column.relationConfig?.cardinality || 'many-to-many'}
            onValueChange={v => onPatch({ relationConfig: { ...column.relationConfig!, cardinality: v as any } })}
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rel-card`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-to-one">One to one</SelectItem>
              <SelectItem value="one-to-many">One to many</SelectItem>
              <SelectItem value="many-to-many">Many to many</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  if (column.type === 'mirror') {
    const mirrorRel = allColumns.find(c => c.id === column.mirrorConfig?.relationColumnId)
    const mirrorTargetCols = (() => {
      if (!mirrorRel?.relationConfig) return []
      const b = boards.find(x => x.id === mirrorRel.relationConfig!.targetAppId)
      return b?.sheets.find(s => s.id === mirrorRel.relationConfig!.targetSheetId)?.columns || []
    })()

    return (
      <div className="gba:space-y-3 gba:border gba:rounded-md gba:p-3">
        <div className="gba:text-xs gba:font-medium">Mirror configuration</div>
        <p className="gba:text-xs gba:text-muted-foreground">Mirrors a value from a related row (read-only).</p>
        <div>
          <Label className="gba:text-xs">Source relation column</Label>
          <Select
            value={column.mirrorConfig?.relationColumnId || ''}
            onValueChange={v =>
              onPatch({
                mirrorConfig: { relationColumnId: v, targetColumnId: column.mirrorConfig?.targetColumnId || '' }
              })
            }
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-mirror-rel`}>
              <SelectValue placeholder={relationColumns.length ? 'Pick relation' : 'No relation columns'} />
            </SelectTrigger>
            <SelectContent>
              {relationColumns.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mirrorTargetCols.length > 0 && (
          <div>
            <Label className="gba:text-xs">Target column to mirror</Label>
            <Select
              value={column.mirrorConfig?.targetColumnId || ''}
              onValueChange={v => onPatch({ mirrorConfig: { ...column.mirrorConfig!, targetColumnId: v } })}
            >
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-mirror-target`}>
                <SelectValue placeholder="Pick column" />
              </SelectTrigger>
              <SelectContent>
                {mirrorTargetCols.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  if (column.type === 'rollup') {
    const rollupRel = allColumns.find(c => c.id === column.rollupConfig?.relationColumnId)
    const rollupTargetCols = (() => {
      if (!rollupRel?.relationConfig) return []
      const b = boards.find(x => x.id === rollupRel.relationConfig!.targetAppId)
      return b?.sheets.find(s => s.id === rollupRel.relationConfig!.targetSheetId)?.columns || []
    })()

    return (
      <div className="gba:space-y-3 gba:border gba:rounded-md gba:p-3">
        <div className="gba:text-xs gba:font-medium">Rollup configuration</div>
        <p className="gba:text-xs gba:text-muted-foreground">Aggregates values from related rows (read-only).</p>
        <div>
          <Label className="gba:text-xs">Source relation column</Label>
          <Select
            value={column.rollupConfig?.relationColumnId || ''}
            onValueChange={v => onPatch({ rollupConfig: { ...column.rollupConfig!, relationColumnId: v } })}
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-rel`}>
              <SelectValue placeholder={relationColumns.length ? 'Pick relation' : 'No relation columns'} />
            </SelectTrigger>
            <SelectContent>
              {relationColumns.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rollupTargetCols.length > 0 && (
          <div>
            <Label className="gba:text-xs">Target column</Label>
            <Select
              value={column.rollupConfig?.targetColumnId || ''}
              onValueChange={v => onPatch({ rollupConfig: { ...column.rollupConfig!, targetColumnId: v } })}
            >
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-target`}>
                <SelectValue placeholder="Pick column" />
              </SelectTrigger>
              <SelectContent>
                {rollupTargetCols.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="gba:text-xs">Aggregation</Label>
          <Select
            value={column.rollupConfig?.aggregation || 'count'}
            onValueChange={v => onPatch({ rollupConfig: { ...column.rollupConfig!, aggregation: v as any } })}
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-agg`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="avg">Average</SelectItem>
              <SelectItem value="min">Min</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return null
}
