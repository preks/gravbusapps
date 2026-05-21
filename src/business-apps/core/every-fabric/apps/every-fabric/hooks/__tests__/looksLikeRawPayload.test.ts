import { looksLikeRawPayload } from '../useAgentSession'

describe('looksLikeRawPayload', () => {
  describe.each([
    ['JSON object', '{"employee_id":"a3ffc84b-bfc4-4af4-8033-a0557e0d3214","full_name":"Mohamed Masoud"}'],
    ['JSON array', '[1, 2, 3]'],
    ['XML/HTML', '<html><body>oops</body></html>'],
    ['UUID embedded', 'Loaded a3ffc84b-bfc4-4af4-8033-a0557e0d3214'],
    ['Email embedded', 'Sent to mmasoud@newwork.com'],
    ['Traceback', 'Traceback (most recent call last):\n  File "x.py", line 1'],
    ['HTTP 404 error', "Client error '404 Not Found' for url ..."],
    ['HTTP 500 error', "Client error '500 Internal Server Error'"],
    ['Flow engine error', 'Flow engine HTTP error: upstream timed out']
  ])('flags %s as unsafe', (_label, value) => {
    it('returns true', () => {
      expect(looksLikeRawPayload(value)).toBe(true)
    })
  })

  describe.each([
    ['humanised status', 'Querying employee information...'],
    ['humanised tool call', 'Calling Write Todos'],
    ['short fallback', 'Working on it'],
    ['skill loading', 'Loading skill: find-newwork-employee']
  ])('allows %s', (_label, value) => {
    it('returns false', () => {
      expect(looksLikeRawPayload(value)).toBe(false)
    })
  })

  it('flags strings longer than maxLen', () => {
    const long = 'A'.repeat(500)
    expect(looksLikeRawPayload(long)).toBe(true)
    expect(looksLikeRawPayload(long, Number.MAX_SAFE_INTEGER)).toBe(false)
  })

  it('handles empty / whitespace inputs', () => {
    expect(looksLikeRawPayload('')).toBe(false)
    expect(looksLikeRawPayload('   ')).toBe(false)
  })
})
