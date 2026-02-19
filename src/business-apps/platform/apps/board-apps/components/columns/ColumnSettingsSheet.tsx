import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import type { BoardColumn, BoardColumnType } from '../../types'
import { SelectOptionsEditor } from './SelectOptionsEditor'
import { RelationConfigSection } from './RelationConfigSection'
import { BoardApiService } from '../../services/BoardApiService'

const CHANGEABLE_TYPES: { value: BoardColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Phone' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'status', label: 'Status' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'rating', label: 'Rating' },
  { value: 'progress', label: 'Progress' }
]

export interface ColumnSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  column: BoardColumn
  allColumns: BoardColumn[]
  currentBoardId: string
  currentSheetId: string
  onSave: (updated: BoardColumn) => void
  'data-testid'?: string
}

interface BoardInfo {
  id: string
  name: string
  sheets: Array<{ id: string; name: string; columns: Array<{ id: string; name: string; label: string }> }>
}

export const ColumnSettingsSheet: React.FC<ColumnSettingsSheetProps> = ({
  open,
  onOpenChange,
  column,
  allColumns,
  onSave,
  'data-testid': testId = 'column-settings'
}) => {
  const [draft, setDraft] = useState<BoardColumn>({ ...column })
  const [boards, setBoards] = useState<BoardInfo[]>([])

  useEffect(() => {
    if (!open) return
    setDraft({ ...column })
  }, [open, column])

  useEffect(() => {
    if (!open) return
    if (draft.type !== 'relation' && draft.type !== 'mirror' && draft.type !== 'rollup') return
    void (async () => {
      try {
        const res = await BoardApiService.listBoards({ limit: 50 })
        if (!res?.items) return
        const loaded: BoardInfo[] = []
        for (const b of res.items) {
          try {
            const full = await BoardApiService.getBoard(b.id)
            if (full) {
              loaded.push({
                id: full.id,
                name: full.name,
                sheets: (full.sheets || []).map(s => ({
                  id: s.id,
                  name: s.name,
                  columns: (s.columns || []).map(c => ({ id: c.id, name: c.name, label: c.label }))
                }))
              })
            }
          } catch {
            /* skip */
          }
        }
        setBoards(loaded)
      } catch {
        /* ignore */
      }
    })()
  }, [open, draft.type])

  const patch = useCallback((updates: Partial<BoardColumn>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSave = useCallback(() => {
    onSave(draft)
    onOpenChange(false)
  }, [draft, onSave, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gba:w-full gba:max-w-md" data-testid={testId}>
        <SheetHeader>
          <SheetTitle>Column settings</SheetTitle>
        </SheetHeader>

        <div className="gba:px-4 gba:pb-4 gba:space-y-4 gba:overflow-y-auto gba:flex-1">
          <div>
            <Label className="gba:text-xs">Column type</Label>
            <Select value={draft.type} onValueChange={v => patch({ type: v as BoardColumnType })}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGEABLE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="gba:text-xs">Label</Label>
            <Input
              value={draft.label}
              onChange={e => patch({ label: e.target.value })}
              className="gba:h-8 gba:text-xs"
              data-testid={`${testId}-label`}
            />
          </div>

          <div>
            <Label className="gba:text-xs">Field name</Label>
            <Input
              value={draft.name}
              disabled
              className="gba:h-8 gba:text-xs gba:bg-muted/30"
              data-testid={`${testId}-name`}
            />
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <Label className="gba:text-xs">Required</Label>
            <Switch
              checked={draft.isRequired}
              onCheckedChange={v => patch({ isRequired: v })}
              data-testid={`${testId}-required`}
            />
          </div>

          {(draft.type === 'select' || draft.type === 'status' || draft.type === 'multiselect') && (
            <div>
              <Label className="gba:text-xs gba:mb-2 gba:block">Options</Label>
              <SelectOptionsEditor
                options={draft.selectOptions || []}
                onChange={opts => patch({ selectOptions: opts })}
                data-testid={`${testId}-options`}
              />
            </div>
          )}

          <RelationConfigSection
            column={draft}
            boards={boards}
            allColumns={allColumns}
            onPatch={patch}
            testId={testId}
          />
        </div>

        <SheetFooter className="gba:flex gba:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${testId}-save`}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
