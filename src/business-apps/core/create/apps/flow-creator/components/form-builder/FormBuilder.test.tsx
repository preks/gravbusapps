import { deriveReadableFieldName, shouldNormalizeHiddenName, slugifyKey } from './FormBuilder'

describe('FormBuilder', () => {
  it('normalizes short abbreviated field names into readable slugified keys', () => {
    expect(shouldNormalizeHiddenName('re', 'Reason')).toBe(true)
    expect(slugifyKey('Reason')).toBe('reason')
    expect(deriveReadableFieldName('re', 'Reason', new Set())).toBe('reason')
  })

  it('normalizes stale short keys when the label changed completely', () => {
    expect(shouldNormalizeHiddenName('su', 'Title')).toBe(true)
    expect(slugifyKey('Title')).toBe('title')
    expect(deriveReadableFieldName('su', 'Title', new Set())).toBe('title')
  })

  it('keeps short names that already match the readable slug', () => {
    expect(shouldNormalizeHiddenName('id', 'ID')).toBe(false)
    expect(deriveReadableFieldName('id', 'ID', new Set())).toBe('id')
  })

  it('normalizes truncated label prefixes to the full readable slug', () => {
    expect(shouldNormalizeHiddenName('amou', 'Amount')).toBe(true)
    expect(deriveReadableFieldName('amou', 'Amount', new Set())).toBe('amount')
  })
})
