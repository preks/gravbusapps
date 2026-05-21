import {
  columnIndexToLetter,
  excelColumnLettersToZeroBasedIndex,
  parseA1Reference,
  toA1Reference
} from '../univerCoordinates'

describe('univerCoordinates', () => {
  describe('excelColumnLettersToZeroBasedIndex', () => {
    it('maps Excel letters to 0-based indices', () => {
      expect(excelColumnLettersToZeroBasedIndex('A')).toBe(0)
      expect(excelColumnLettersToZeroBasedIndex('Z')).toBe(25)
      expect(excelColumnLettersToZeroBasedIndex('AA')).toBe(26)
    })

    it('returns null for invalid input', () => {
      expect(excelColumnLettersToZeroBasedIndex('')).toBeNull()
      expect(excelColumnLettersToZeroBasedIndex('A1')).toBeNull()
      expect(excelColumnLettersToZeroBasedIndex('_')).toBeNull()
    })
  })

  describe('parseA1Reference', () => {
    it('parses single cells with trimming and case', () => {
      expect(parseA1Reference('  b2 ')).toEqual({ row: 1, col: 1 })
      expect(parseA1Reference('AA10')).toEqual({ row: 9, col: 26 })
    })

    it('rejects invalid refs', () => {
      expect(parseA1Reference('')).toBeNull()
      expect(parseA1Reference('A0')).toBeNull()
      expect(parseA1Reference('1A')).toBeNull()
    })
  })

  describe('toA1Reference / columnIndexToLetter', () => {
    it('round-trips with parseA1Reference for in-range coords', () => {
      expect(toA1Reference(0, 0)).toBe('A1')
      expect(columnIndexToLetter(26)).toBe('AA')
      expect(parseA1Reference(toA1Reference(4, 5))).toEqual({ row: 4, col: 5 })
    })
  })
})
