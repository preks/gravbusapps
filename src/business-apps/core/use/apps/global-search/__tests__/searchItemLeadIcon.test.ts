import type { SearchItem } from '../types'
import { resolveSearchItemLeadIconName, resolveWorkflowLeadVisual } from '../utils'

const baseItem: Pick<SearchItem, 'id' | 'name' | 'categoryIds' | 'primaryTarget' | 'analytics'> = {
  id: 'x',
  name: 'Test',
  categoryIds: [],
  primaryTarget: { kind: 'URL', href: '/' },
  analytics: { provider: 'p', trackingId: 't', rank: 1 }
}

describe('resolveSearchItemLeadIconName', () => {
  it('maps SPREADSHEET + FILE to FileXls', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'SPREADSHEET',
      typeLabel: 'Spreadsheet',
      kind: 'FILE'
    }
    expect(resolveSearchItemLeadIconName(item)).toBe('FileXls')
  })

  it('maps OFFICE_SPREADSHEET + FILE to FileXls', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'OFFICE_SPREADSHEET',
      typeLabel: 'Spreadsheet',
      kind: 'FILE'
    }
    expect(resolveSearchItemLeadIconName(item)).toBe('FileXls')
  })

  it('uses normalized typeLabel when type is not in the office map', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'UNKNOWN_FILE_ENTITY',
      typeLabel: 'Spreadsheet',
      kind: 'FILE'
    }
    expect(resolveSearchItemLeadIconName(item)).toBe('FileXls')
  })

  it('maps office types when kind is omitted', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'PDF',
      typeLabel: 'PDF'
    }
    expect(resolveSearchItemLeadIconName(item)).toBe('FilePdf')
  })

  it('does not use office map when kind is set to a non-file value', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'PDF',
      typeLabel: 'PDF',
      kind: 'RECORD'
    }
    expect(resolveSearchItemLeadIconName(item)).toBeUndefined()
  })

  it('uses generic File for FILE with unknown type', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'CUSTOM',
      typeLabel: 'Custom',
      kind: 'FILE'
    }
    expect(resolveSearchItemLeadIconName(item)).toBe('File')
  })
})

describe('resolveWorkflowLeadVisual', () => {
  it('returns FlowArrow on teal gradient for WORKFLOW', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'WORKFLOW',
      typeLabel: 'Flow'
    }
    expect(resolveWorkflowLeadVisual(item)).toEqual({
      iconName: 'FlowArrow',
      iconClass: 'gba:text-white',
      containerClass: 'gba:bg-linear-to-br gba:from-teal-500 gba:to-emerald-600'
    })
  })

  it('returns null for non-workflow types', () => {
    const item: SearchItem = {
      ...baseItem,
      type: 'PAGE',
      typeLabel: 'Page'
    }
    expect(resolveWorkflowLeadVisual(item)).toBeNull()
  })
})
