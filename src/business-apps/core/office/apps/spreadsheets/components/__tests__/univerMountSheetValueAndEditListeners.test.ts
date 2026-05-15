/**
 * 1e: emit serialization key resolution.
 *
 * Two consecutive emits on the same logical worksheet must serialize on the same key, even
 * when one carries an explicit `worksheetId` and the other does not. Regressing this re-opens
 * the post-flush snapshot race that drops cells under concurrent emits.
 */
import { EMIT_LITERAL_FALLBACK_KEY, resolveEmitSerializationKey } from '../univerMountSheetValueAndEditListeners'

describe('resolveEmitSerializationKey', () => {
  it('uses explicit payload worksheetId when present', () => {
    const result = resolveEmitSerializationKey('sheet-1', null, null, null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to facade worksheetId when payload is missing', () => {
    const result = resolveEmitSerializationKey(null, 'sheet-1', null, null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to active worksheet captured at event time when facade is missing', () => {
    const result = resolveEmitSerializationKey(null, null, 'sheet-1', null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to active worksheet at handling time when event-time capture missed', () => {
    const result = resolveEmitSerializationKey(null, null, null, 'sheet-1')
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('uses the literal fallback only when every source is empty', () => {
    const result = resolveEmitSerializationKey(null, null, null, null)
    expect(result).toEqual({ key: EMIT_LITERAL_FALLBACK_KEY, usedLiteralFallback: true })
  })

  it('produces the same key when one event carries id and the next does not (same logical sheet)', () => {
    const first = resolveEmitSerializationKey(null, null, 'sheet-1', 'sheet-1')
    const second = resolveEmitSerializationKey('sheet-1', null, null, null)
    expect(first.key).toBe(second.key)
    expect(first.key).toBe('sheet-1')
  })

  it('treats empty strings as missing instead of selecting them', () => {
    const result = resolveEmitSerializationKey('', '', '', 'sheet-1')
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })
})
