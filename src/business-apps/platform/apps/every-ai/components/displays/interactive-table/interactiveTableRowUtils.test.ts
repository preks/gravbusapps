import { ensureDataTableRowIds } from './interactiveTableRowUtils'
import type { InteractiveTableColumn } from '../../../types/models'

const columns: InteractiveTableColumn[] = [
  { id: 'employee', header: 'Employee', dataType: 'chip', entityType: 'employee' },
  { id: 'employeeSkills.skill', header: 'Skills', dataType: 'chip_list', entityType: 'skill' }
]

describe('ensureDataTableRowIds', () => {
  it('keeps existing scalar row id', () => {
    const rows = ensureDataTableRowIds([{ id: 'uuid-1', name: 'A' }], { columns })
    expect(rows[0].id).toBe('uuid-1')
  })

  it('derives id from chip column when row has no top-level id', () => {
    const rows = ensureDataTableRowIds(
      [
        {
          employee: { id: '08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f', label: 'Daniel Vorberg' },
          'employeeSkills.skill': [{ id: 'skill-1', label: 'Java' }]
        }
      ],
      { columns }
    )
    expect(rows[0].id).toBe('08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f')
  })

  it('uses rowEntityIdColumn when provided', () => {
    const rows = ensureDataTableRowIds([{ empId: 'custom-id', employee: { id: 'other', label: 'X' } }], {
      columns,
      rowEntityIdColumn: 'empId'
    })
    expect(rows[0].id).toBe('custom-id')
  })

  it('falls back to index-based id', () => {
    const rows = ensureDataTableRowIds([{ label: 'no ids' }], {
      columns: [{ id: 'label', header: 'L', dataType: 'text' }]
    })
    expect(rows[0].id).toBe('interactive-table-row-0')
  })
})
