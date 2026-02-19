import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import type { BoardColumn, BoardColumnType } from '../../types'

export interface AddColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingColumns: BoardColumn[]
  currentBoardId: string
  currentSheetId: string
  onCreate: (column: BoardColumn) => Promise<void>
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function toSafeName(label: string): string {
  const cleaned = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const startsOk = /^[a-z_]/.test(cleaned)
  return startsOk ? cleaned : `col_${cleaned || 'field'}`
}

function ensureUnique(base: string, used: Set<string>): string {
  if (!used.has(base)) return base
  for (let i = 2; i < 200; i++) {
    const candidate = `${base}_${i}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}_${Date.now()}`
}

export const AddColumnDialog: React.FC<AddColumnDialogProps> = ({
  open,
  onOpenChange,
  existingColumns,
  currentBoardId,
  currentSheetId,
  onCreate,
  'data-testid': testId = 'add-column-dialog'
}) => {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<BoardColumnType>('text')
  const [mirrorRelationColumnId, setMirrorRelationColumnId] = useState('')
  const [mirrorTargetColumnId, setMirrorTargetColumnId] = useState('')
  const [rollupRelationColumnId, setRollupRelationColumnId] = useState('')
  const [rollupTargetColumnId, setRollupTargetColumnId] = useState('')
  const [rollupAgg, setRollupAgg] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count')

  const usedNames = useMemo(() => new Set(existingColumns.map(c => c.name)), [existingColumns])

  const suggestedName = useMemo(() => {
    const base = toSafeName(label || 'field')
    return ensureUnique(base, usedNames)
  }, [label, usedNames])

  const relationColumns = useMemo(() => existingColumns.filter(c => c.type === 'relation'), [existingColumns])
  const nonComputedColumns = useMemo(
    () => existingColumns.filter(c => c.type !== 'mirror' && c.type !== 'rollup'),
    [existingColumns]
  )

  const canCreate = useMemo(() => {
    if (!label.trim()) return false
    if (type === 'mirror') return Boolean(mirrorRelationColumnId && mirrorTargetColumnId)
    if (type === 'rollup') return Boolean(rollupRelationColumnId && rollupTargetColumnId && rollupAgg)
    return true
  }, [
    label,
    type,
    mirrorRelationColumnId,
    mirrorTargetColumnId,
    rollupRelationColumnId,
    rollupTargetColumnId,
    rollupAgg
  ])

  const handleTypeChange = useCallback(
    (next: BoardColumnType) => {
      setType(next)
      if (next === 'mirror') {
        setMirrorRelationColumnId(prev => prev || relationColumns[0]?.id || '')
        setMirrorTargetColumnId(
          prev => prev || nonComputedColumns.find(c => c.type !== 'relation')?.id || nonComputedColumns[0]?.id || ''
        )
      }
      if (next === 'rollup') {
        setRollupRelationColumnId(prev => prev || relationColumns[0]?.id || '')
        setRollupTargetColumnId(
          prev => prev || nonComputedColumns.find(c => c.type !== 'relation')?.id || nonComputedColumns[0]?.id || ''
        )
        setRollupAgg(prev => prev || 'count')
      }
    },
    [relationColumns, nonComputedColumns]
  )

  const handleCreate = useCallback(async () => {
    if (!canCreate) return
    const order = existingColumns.length ? Math.max(...existingColumns.map(c => c.order || 0)) + 1 : 0

    const column: BoardColumn = {
      id: createId(),
      name: suggestedName,
      label: label.trim(),
      type,
      isVisible: true,
      isEditable: type !== 'mirror' && type !== 'rollup',
      isRequired: false,
      isUnique: false,
      order,
      ...(type === 'relation'
        ? {
            relationConfig: {
              targetAppId: currentBoardId,
              targetSheetId: currentSheetId,
              cardinality: 'many-to-many' as const,
              displayColumn: 'name'
            }
          }
        : null),
      ...(type === 'mirror'
        ? {
            mirrorConfig: {
              relationColumnId: mirrorRelationColumnId,
              targetColumnId: mirrorTargetColumnId
            }
          }
        : null),
      ...(type === 'rollup'
        ? {
            rollupConfig: {
              relationColumnId: rollupRelationColumnId,
              targetColumnId: rollupTargetColumnId,
              aggregation: rollupAgg
            }
          }
        : null),
      ...(type === 'status'
        ? {
            selectOptions: [
              { value: 'todo', label: 'To Do', colorToken: 'muted' },
              { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
              { value: 'done', label: 'Done', colorToken: 'success' }
            ]
          }
        : null),
      ...(type === 'select' || type === 'multiselect'
        ? {
            selectOptions: []
          }
        : null)
    }

    await onCreate(column)
    setLabel('')
    setType('text')
    setMirrorRelationColumnId('')
    setMirrorTargetColumnId('')
    setRollupRelationColumnId('')
    setRollupTargetColumnId('')
    setRollupAgg('count')
    onOpenChange(false)
  }, [
    canCreate,
    existingColumns,
    label,
    suggestedName,
    type,
    currentBoardId,
    currentSheetId,
    mirrorRelationColumnId,
    mirrorTargetColumnId,
    rollupRelationColumnId,
    rollupTargetColumnId,
    rollupAgg,
    onCreate,
    onOpenChange
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Add column</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-3">
          <div>
            <Label className="gba:text-xs" htmlFor={`${testId}-label`}>
              Label
            </Label>
            <Input
              id={`${testId}-label`}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Owner"
              className="gba:h-8 gba:text-xs"
              autoFocus
              data-testid={`${testId}-input-label`}
            />
            <div className="gba:mt-1 gba:text-[10px] gba:text-muted-foreground" data-testid={`${testId}-name-preview`}>
              Key: <span className="gba:font-mono">{suggestedName}</span>
            </div>
          </div>

          <div>
            <Label className="gba:text-xs">Type</Label>
            <Select value={type} onValueChange={v => handleTypeChange(v as BoardColumnType)}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="datetime">Date & time</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="multiselect">Multi-select</SelectItem>
                <SelectItem value="boolean">Checkbox</SelectItem>
                <SelectItem value="people">People</SelectItem>
                <SelectItem value="relation">Relation</SelectItem>
                <SelectItem value="mirror">Mirror</SelectItem>
                <SelectItem value="rollup">Rollup</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'mirror' && (
            <div className="gba:space-y-2">
              <div>
                <Label className="gba:text-xs">Relation column</Label>
                <Select value={mirrorRelationColumnId} onValueChange={setMirrorRelationColumnId}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-mirror-relation`}>
                    <SelectValue
                      placeholder={relationColumns.length ? 'Pick relation' : 'Add a relation column first'}
                    />
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
              <div>
                <Label className="gba:text-xs">Target column</Label>
                <Select value={mirrorTargetColumnId} onValueChange={setMirrorTargetColumnId}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-mirror-target`}>
                    <SelectValue placeholder="Pick column" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonComputedColumns.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'rollup' && (
            <div className="gba:space-y-2">
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                <div>
                  <Label className="gba:text-xs">Aggregation</Label>
                  <Select value={rollupAgg} onValueChange={v => setRollupAgg(v as any)}>
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
                <div>
                  <Label className="gba:text-xs">Target column</Label>
                  <Select value={rollupTargetColumnId} onValueChange={setRollupTargetColumnId}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-target`}>
                      <SelectValue placeholder="Pick column" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonComputedColumns.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="gba:text-xs">Relation column</Label>
                <Select value={rollupRelationColumnId} onValueChange={setRollupRelationColumnId}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-relation`}>
                    <SelectValue
                      placeholder={relationColumns.length ? 'Pick relation' : 'Add a relation column first'}
                    />
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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!canCreate} data-testid={`${testId}-create`}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
