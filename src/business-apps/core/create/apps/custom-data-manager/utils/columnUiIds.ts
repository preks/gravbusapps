import type { ColumnDefinition } from '../types'
import { InputType } from '../types'

export type UiColumnDefinition = ColumnDefinition & { uiId: string }

export function createUiId(): string {
  // Use a stable, UI-only id for React keys; must not depend on the editable field name.
  return `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function ensureColumnUiIds(columns: ColumnDefinition[]): UiColumnDefinition[] {
  return columns.map(c => {
    const uiId = (c as any).uiId
    return { ...c, uiId: typeof uiId === 'string' && uiId ? uiId : createUiId() }
  })
}

export function stripColumnUiIds(columns: UiColumnDefinition[]): ColumnDefinition[] {
  return columns.map(col => {
    const { uiId, ...rest } = col
    void uiId
    return rest
  })
}

export function createInitialColumns(): UiColumnDefinition[] {
  return [
    {
      uiId: createUiId(),
      type: InputType.TEXT,
      fieldName: 'name',
      label: 'Name',
      required: true
    }
  ]
}

export function createNewColumn(index: number): UiColumnDefinition {
  const n = index + 1
  return {
    uiId: createUiId(),
    type: InputType.TEXT,
    fieldName: `field${n}`,
    label: `Field ${n}`,
    required: false
  }
}
