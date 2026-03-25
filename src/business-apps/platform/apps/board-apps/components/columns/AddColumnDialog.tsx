import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ALL_CREATABLE_TYPES } from './columnTypeDefs'
import { ColumnTypeIcon } from '../table/ColumnTypeIcon'
import { BoardApiService } from '../../services/BoardApiService'
import { RelationFields, MirrorFields, RollupFields } from './AddColumnConfigFields'

export interface AddColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingColumns: BoardColumn[]
  currentBoardId: string
  currentSheetId: string
  preSelectedType?: BoardColumnType
  onCreate: (column: BoardColumn) => Promise<void>
  'data-testid'?: string
}

interface BoardInfo {
  id: string
  name: string
  sheets: Array<{ id: string; name: string; columns: Array<{ id: string; name: string; label: string }> }>
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
  return /^[a-z_]/.test(cleaned) ? cleaned : `col_${cleaned || 'field'}`
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
  preSelectedType,
  onCreate,
  'data-testid': testId = 'add-column-dialog'
}) => {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<BoardColumnType>(preSelectedType || 'text')

  const [relBoardId, setRelBoardId] = useState(currentBoardId)
  const [relSheetId, setRelSheetId] = useState(currentSheetId)
  const [relDisplayCol, setRelDisplayCol] = useState('')
  const [relCardinality, setRelCardinality] = useState<'one-to-one' | 'one-to-many' | 'many-to-many'>('many-to-many')

  const [mirrorRelColId, setMirrorRelColId] = useState('')
  const [mirrorTargetColId, setMirrorTargetColId] = useState('')

  const [rollupRelColId, setRollupRelColId] = useState('')
  const [rollupTargetColId, setRollupTargetColId] = useState('')
  const [rollupAgg, setRollupAgg] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count')

  const [boards, setBoards] = useState<BoardInfo[]>([])
  const [loadingBoards, setLoadingBoards] = useState(false)

  const usedNames = useMemo(() => new Set(existingColumns.map(c => c.name)), [existingColumns])
  const suggestedName = useMemo(() => ensureUnique(toSafeName(label || 'field'), usedNames), [label, usedNames])
  const relationColumns = useMemo(() => existingColumns.filter(c => c.type === 'relation'), [existingColumns])

  useEffect(() => {
    if (open && preSelectedType) setType(preSelectedType)
  }, [open, preSelectedType])

  useEffect(() => {
    if (!open) return
    if (type !== 'relation' && type !== 'mirror' && type !== 'rollup') return
    if (boards.length > 0) return
    let cancelled = false
    setLoadingBoards(true)
    void (async () => {
      try {
        const boardList = await BoardApiService.listBoards({ limit: 50 })
        if (cancelled || !boardList?.length) return
        const loaded: BoardInfo[] = []
        for (const b of boardList) {
          try {
            const full = await BoardApiService.getBoard(b.id)
            if (full)
              loaded.push({
                id: full.id,
                name: full.name,
                sheets: (full.sheets || []).map(s => ({
                  id: s.id,
                  name: s.name,
                  columns: (s.columns || []).map(c => ({ id: c.id, name: c.name, label: c.label }))
                }))
              })
          } catch {
            /* skip */
          }
        }
        if (!cancelled) setBoards(loaded)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingBoards(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, type, boards.length])

  const targetSheets = boards.find(b => b.id === relBoardId)?.sheets || []
  const targetColumns = targetSheets.find(s => s.id === relSheetId)?.columns || []

  const mirrorRelCol = existingColumns.find(c => c.id === mirrorRelColId)
  const mirrorTargetCols = useMemo(() => {
    if (!mirrorRelCol?.relationConfig) return []
    const b = boards.find(x => x.id === mirrorRelCol.relationConfig!.targetAppId)
    return b?.sheets.find(s => s.id === mirrorRelCol.relationConfig!.targetSheetId)?.columns || []
  }, [mirrorRelCol, boards])

  const rollupRelCol = existingColumns.find(c => c.id === rollupRelColId)
  const rollupTargetCols = useMemo(() => {
    if (!rollupRelCol?.relationConfig) return []
    const b = boards.find(x => x.id === rollupRelCol.relationConfig!.targetAppId)
    return b?.sheets.find(s => s.id === rollupRelCol.relationConfig!.targetSheetId)?.columns || []
  }, [rollupRelCol, boards])

  const canCreate = useMemo(() => {
    if (!label.trim()) return false
    if (type === 'relation') return Boolean(relBoardId && relSheetId)
    if (type === 'mirror') return Boolean(mirrorRelColId && mirrorTargetColId)
    if (type === 'rollup') return Boolean(rollupRelColId && rollupTargetColId && rollupAgg)
    return true
  }, [
    label,
    type,
    relBoardId,
    relSheetId,
    mirrorRelColId,
    mirrorTargetColId,
    rollupRelColId,
    rollupTargetColId,
    rollupAgg
  ])

  const resetState = useCallback(() => {
    setLabel('')
    setType('text')
    setRelBoardId(currentBoardId)
    setRelSheetId(currentSheetId)
    setRelDisplayCol('')
    setRelCardinality('many-to-many')
    setMirrorRelColId('')
    setMirrorTargetColId('')
    setRollupRelColId('')
    setRollupTargetColId('')
    setRollupAgg('count')
  }, [currentBoardId, currentSheetId])

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
              targetAppId: relBoardId,
              targetSheetId: relSheetId,
              cardinality: relCardinality,
              displayColumn: relDisplayCol || undefined
            }
          }
        : null),
      ...(type === 'mirror'
        ? { mirrorConfig: { relationColumnId: mirrorRelColId, targetColumnId: mirrorTargetColId } }
        : null),
      ...(type === 'rollup'
        ? {
            rollupConfig: {
              relationColumnId: rollupRelColId,
              targetColumnId: rollupTargetColId,
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
      ...(type === 'priority'
        ? {
            selectOptions: [
              { value: 'low', label: 'Low', colorToken: 'muted' },
              { value: 'medium', label: 'Medium', colorToken: 'info' },
              { value: 'high', label: 'High', colorToken: 'warning' },
              { value: 'critical', label: 'Critical', colorToken: 'destructive' }
            ]
          }
        : null),
      ...(type === 'select' || type === 'multiselect' ? { selectOptions: [] } : null),
      ...(type === 'people' ? { peopleConfig: { isAssignment: true, multiple: false } } : null)
    }

    await onCreate(column)
    resetState()
    onOpenChange(false)
  }, [
    canCreate,
    existingColumns,
    label,
    suggestedName,
    type,
    relBoardId,
    relSheetId,
    relCardinality,
    relDisplayCol,
    mirrorRelColId,
    mirrorTargetColId,
    rollupRelColId,
    rollupTargetColId,
    rollupAgg,
    onCreate,
    onOpenChange,
    resetState
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) {
          resetState()
          onOpenChange(false)
        }
      }}
    >
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Add column</DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-3 gba:max-h-96 gba:overflow-y-auto gba:pr-1">
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
            <div className="gba:mt-1 gba:text-[10px] gba:text-muted-foreground">
              Key: <span className="gba:font-mono">{suggestedName}</span>
            </div>
          </div>
          <div>
            <Label className="gba:text-xs">Type</Label>
            <Select value={type} onValueChange={v => setType(v as BoardColumnType)}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CREATABLE_TYPES.map(t => (
                  <SelectItem key={t.type} value={t.type}>
                    <span className="gba:flex gba:items-center gba:gap-1.5">
                      <ColumnTypeIcon type={t.type} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'relation' && (
            <RelationFields
              boards={boards}
              loading={loadingBoards}
              boardId={relBoardId}
              sheetId={relSheetId}
              displayCol={relDisplayCol}
              cardinality={relCardinality}
              targetSheets={targetSheets}
              targetColumns={targetColumns}
              onBoardChange={v => {
                setRelBoardId(v)
                setRelSheetId('')
                setRelDisplayCol('')
              }}
              onSheetChange={v => {
                setRelSheetId(v)
                setRelDisplayCol('')
              }}
              onDisplayColChange={setRelDisplayCol}
              onCardinalityChange={v => setRelCardinality(v as any)}
              testId={testId}
            />
          )}
          {type === 'mirror' && (
            <MirrorFields
              relationColumns={relationColumns}
              mirrorRelColId={mirrorRelColId}
              mirrorTargetColId={mirrorTargetColId}
              mirrorTargetCols={mirrorTargetCols}
              loading={loadingBoards}
              onRelChange={setMirrorRelColId}
              onTargetChange={setMirrorTargetColId}
              testId={testId}
            />
          )}
          {type === 'rollup' && (
            <RollupFields
              relationColumns={relationColumns}
              rollupRelColId={rollupRelColId}
              rollupTargetColId={rollupTargetColId}
              rollupAgg={rollupAgg}
              rollupTargetCols={rollupTargetCols}
              loading={loadingBoards}
              onRelChange={setRollupRelColId}
              onTargetChange={setRollupTargetColId}
              onAggChange={v => setRollupAgg(v as any)}
              testId={testId}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetState()
              onOpenChange(false)
            }}
            data-testid={`${testId}-cancel`}
          >
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
