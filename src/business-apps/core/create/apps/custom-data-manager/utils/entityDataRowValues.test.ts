import { InputType, type ColumnDefinition } from '../types'
import {
  getInitialEntityDataEditValue,
  serializeEntityDataEditValues,
  type EntityDataEditValues
} from './entityDataRowValues'

const columns: ColumnDefinition[] = [
  { type: InputType.TEXT, name: 'title', label: 'Title' },
  { type: InputType.NUMBER, name: 'amount', label: 'Amount' },
  { type: InputType.CHECKBOX, name: 'active', label: 'Active' },
  { type: InputType.MULTISELECT, name: 'tags', label: 'Tags' },
  { type: InputType.DATE, name: 'due_date', label: 'Due Date' }
]

describe('entityDataRowValues', () => {
  it('converts row values into typed edit values', () => {
    expect(getInitialEntityDataEditValue('42', columns[1])).toBe(42)
    expect(getInitialEntityDataEditValue('true', columns[2])).toBe(true)
    expect(getInitialEntityDataEditValue('a,b', columns[3])).toEqual(['a', 'b'])
    expect(getInitialEntityDataEditValue('2026-04-29T10:00:00Z', columns[4])).toBe('2026-04-29')
  })

  it('serializes typed edit values for row mutations', () => {
    const values: EntityDataEditValues = {
      title: 'Budget',
      amount: '12.5',
      active: true,
      tags: ['finance', 'approved'],
      due_date: ''
    }

    expect(serializeEntityDataEditValues(columns, values)).toEqual({
      title: 'Budget',
      amount: 12.5,
      active: true,
      tags: ['finance', 'approved'],
      due_date: null
    })
  })
})
