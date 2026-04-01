import { getNestedFieldValue, recordsToSelectOptions } from '../entitySelectOptionsResolver'

describe('entitySelectOptionsResolver', () => {
  describe('getNestedFieldValue', () => {
    it('reads nested paths', () => {
      const row = { owner: { name: 'Ada' } } as Record<string, unknown>
      expect(getNestedFieldValue(row, 'owner.name')).toBe('Ada')
    })

    it('returns undefined for missing path', () => {
      expect(getNestedFieldValue({}, 'missing')).toBeUndefined()
    })
  })

  describe('recordsToSelectOptions', () => {
    it('maps value and label fields and dedupes by value', () => {
      const records = [
        { id: '1', title: 'A' },
        { id: '1', title: 'B' },
        { id: '2', title: 'B' }
      ] as Record<string, unknown>[]
      expect(recordsToSelectOptions(records, 'id', 'title')).toEqual([
        { value: '1', label: 'A' },
        { value: '2', label: 'B' }
      ])
    })

    it('skips empty values', () => {
      expect(recordsToSelectOptions([{ id: '', title: 'X' }] as Record<string, unknown>[], 'id', 'title')).toEqual([])
    })
  })
})
