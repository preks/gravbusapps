import { formatRelativeTime, parseIsoTimestamp, parseIsoTimestampMs } from '../renderUtils'

describe('parseIsoTimestamp', () => {
  it('returns null for nullish / empty input', () => {
    expect(parseIsoTimestamp(null)).toBeNull()
    expect(parseIsoTimestamp(undefined)).toBeNull()
    expect(parseIsoTimestamp('')).toBeNull()
    expect(parseIsoTimestamp('   ')).toBeNull()
  })

  it('treats naive-UTC ISO strings as UTC', () => {
    // Without the parser, `new Date(...)` below would be interpreted as local
    // time, which shifts the absolute epoch value by the host timezone offset.
    const naive = '2026-04-22T08:22:55'
    const withZ = '2026-04-22T08:22:55Z'
    expect(parseIsoTimestamp(naive)?.getTime()).toBe(new Date(withZ).getTime())
  })

  it('preserves an explicit Z suffix', () => {
    const withZ = '2026-04-22T08:22:55Z'
    expect(parseIsoTimestamp(withZ)?.getTime()).toBe(new Date(withZ).getTime())
  })

  it('preserves an explicit ±HH:MM offset', () => {
    const withOffset = '2026-04-22T10:22:55+02:00'
    // 10:22:55+02:00 == 08:22:55Z
    expect(parseIsoTimestamp(withOffset)?.getTime()).toBe(new Date('2026-04-22T08:22:55Z').getTime())
  })

  it('preserves a compact ±HHMM offset', () => {
    const withOffset = '2026-04-22T10:22:55+0200'
    expect(parseIsoTimestamp(withOffset)?.getTime()).toBe(new Date('2026-04-22T08:22:55Z').getTime())
  })

  it('supports microsecond precision from Python isoformat()', () => {
    // Python's `datetime.isoformat()` produces microsecond precision. JS only
    // parses millisecond precision, but the browser still accepts the string
    // by truncating; epoch equivalence to the Z-suffixed form is what matters.
    const naive = '2026-04-22T08:22:55.123456'
    const withZ = '2026-04-22T08:22:55.123456Z'
    expect(parseIsoTimestamp(naive)?.getTime()).toBe(new Date(withZ).getTime())
  })

  it('passes through Date instances', () => {
    const d = new Date('2026-04-22T08:22:55Z')
    expect(parseIsoTimestamp(d)).toBe(d)
  })

  it('returns null for unparseable strings', () => {
    expect(parseIsoTimestamp('not-a-date')).toBeNull()
  })

  it('parseIsoTimestampMs mirrors parseIsoTimestamp', () => {
    expect(parseIsoTimestampMs('2026-04-22T08:22:55')).toBe(new Date('2026-04-22T08:22:55Z').getTime())
    expect(parseIsoTimestampMs(null)).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-04-22T10:30:00Z').getTime()

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reports a session created 5 minutes ago correctly even when backend emits naive UTC', () => {
    // Backend sent "2026-04-22T10:25:00" (naive UTC). Prior bug parsed this as
    // local time, producing ~2h ago at UTC+2. With the fix, this must render
    // as "5m ago" regardless of the host timezone.
    expect(formatRelativeTime('2026-04-22T10:25:00')).toBe('5m ago')
  })

  it('handles explicit UTC offsets without skew', () => {
    expect(formatRelativeTime('2026-04-22T10:25:00Z')).toBe('5m ago')
    expect(formatRelativeTime('2026-04-22T12:25:00+02:00')).toBe('5m ago')
  })

  it('returns "Just now" for sub-minute differences', () => {
    expect(formatRelativeTime('2026-04-22T10:29:30')).toBe('Just now')
  })

  it('clamps small negative diffs to "Just now" (clock skew)', () => {
    // Backend clock 30s ahead of the browser -> diff is negative. Must not
    // render a future-looking label.
    expect(formatRelativeTime('2026-04-22T10:30:30')).toBe('Just now')
  })

  it('renders hours and days correctly', () => {
    expect(formatRelativeTime('2026-04-22T08:30:00')).toBe('2h ago')
    expect(formatRelativeTime('2026-04-21T10:30:00')).toBe('Yesterday')
    expect(formatRelativeTime('2026-04-19T10:30:00')).toBe('3d ago')
  })

  it('returns empty string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date')).toBe('')
  })
})
