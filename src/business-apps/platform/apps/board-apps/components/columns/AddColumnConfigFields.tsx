/**
 * Configuration sub-forms for Relation, Mirror, and Rollup column creation.
 * Extracted from AddColumnDialog to keep files under 300 lines.
 */

import React from 'react'
import {
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Spinner
} from '@newwork/nw-design-system'
import type { BoardColumn } from '../../types'

interface BoardInfo {
  id: string
  name: string
  sheets: Array<{ id: string; name: string; columns: Array<{ id: string; name: string; label: string }> }>
}

export interface RelationFieldsProps {
  boards: BoardInfo[]
  loading: boolean
  boardId: string
  sheetId: string
  displayCol: string
  cardinality: string
  targetSheets: Array<{ id: string; name: string }>
  targetColumns: Array<{ id: string; name: string; label: string }>
  onBoardChange: (v: string) => void
  onSheetChange: (v: string) => void
  onDisplayColChange: (v: string) => void
  onCardinalityChange: (v: string) => void
  testId: string
}

export const RelationFields: React.FC<RelationFieldsProps> = ({
  boards,
  loading,
  boardId,
  sheetId,
  displayCol,
  cardinality,
  targetSheets,
  targetColumns,
  onBoardChange,
  onSheetChange,
  onDisplayColChange,
  onCardinalityChange,
  testId
}) => (
  <div className="gba:space-y-2 gba:border gba:rounded-md gba:p-3">
    <div className="gba:text-xs gba:font-medium">Relation target</div>
    <p className="gba:text-[10px] gba:text-muted-foreground">Links rows in this board to rows in another board.</p>
    {loading && <Spinner className="gba:w-3 gba:h-3" />}
    <div>
      <Label className="gba:text-xs">Board</Label>
      <Select value={boardId} onValueChange={onBoardChange}>
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
        <Select value={sheetId} onValueChange={onSheetChange}>
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
        <Select value={displayCol} onValueChange={onDisplayColChange}>
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
      <Select value={cardinality} onValueChange={onCardinalityChange}>
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

export interface MirrorFieldsProps {
  relationColumns: BoardColumn[]
  mirrorRelColId: string
  mirrorTargetColId: string
  mirrorTargetCols: Array<{ id: string; name: string; label: string }>
  loading: boolean
  onRelChange: (v: string) => void
  onTargetChange: (v: string) => void
  testId: string
}

export const MirrorFields: React.FC<MirrorFieldsProps> = ({
  relationColumns,
  mirrorRelColId,
  mirrorTargetColId,
  mirrorTargetCols,
  loading,
  onRelChange,
  onTargetChange,
  testId
}) => (
  <div className="gba:space-y-2 gba:border gba:rounded-md gba:p-3">
    <div className="gba:text-xs gba:font-medium">Mirror configuration</div>
    <p className="gba:text-[10px] gba:text-muted-foreground">
      Displays a value from a related row (read-only). Requires a Relation column.
    </p>
    {loading && <Spinner className="gba:w-3 gba:h-3" />}
    {relationColumns.length === 0 && (
      <p className="gba:text-xs gba:text-warning">Add a Relation column first before creating a Mirror.</p>
    )}
    <div>
      <Label className="gba:text-xs">Source relation column</Label>
      <Select value={mirrorRelColId} onValueChange={onRelChange}>
        <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-mirror-relation`}>
          <SelectValue placeholder={relationColumns.length ? 'Pick relation' : 'No relations'} />
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
        <Label className="gba:text-xs">Column to display</Label>
        <Select value={mirrorTargetColId} onValueChange={onTargetChange}>
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

export interface RollupFieldsProps {
  relationColumns: BoardColumn[]
  rollupRelColId: string
  rollupTargetColId: string
  rollupAgg: string
  rollupTargetCols: Array<{ id: string; name: string; label: string }>
  loading: boolean
  onRelChange: (v: string) => void
  onTargetChange: (v: string) => void
  onAggChange: (v: string) => void
  testId: string
}

export const RollupFields: React.FC<RollupFieldsProps> = ({
  relationColumns,
  rollupRelColId,
  rollupTargetColId,
  rollupAgg,
  rollupTargetCols,
  loading,
  onRelChange,
  onTargetChange,
  onAggChange,
  testId
}) => (
  <div className="gba:space-y-2 gba:border gba:rounded-md gba:p-3">
    <div className="gba:text-xs gba:font-medium">Rollup configuration</div>
    <p className="gba:text-[10px] gba:text-muted-foreground">
      Aggregates values from related rows (read-only). Requires a Relation column.
    </p>
    {loading && <Spinner className="gba:w-3 gba:h-3" />}
    {relationColumns.length === 0 && (
      <p className="gba:text-xs gba:text-warning">Add a Relation column first before creating a Rollup.</p>
    )}
    <div>
      <Label className="gba:text-xs">Source relation column</Label>
      <Select value={rollupRelColId} onValueChange={onRelChange}>
        <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-rollup-relation`}>
          <SelectValue placeholder={relationColumns.length ? 'Pick relation' : 'No relations'} />
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
        <Select value={rollupTargetColId} onValueChange={onTargetChange}>
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
      <Select value={rollupAgg} onValueChange={onAggChange}>
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
