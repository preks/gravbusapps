import {
  buildDisplayFields,
  copyTextForValue,
  detailWithoutLlmMeta,
  humanizeKey,
  isStructuredDisplayable,
  parseJsonish
} from '../traceLensDetailView'

describe('traceLensDetailView', () => {
  const routerOutput = JSON.stringify({
    mode: 'direct',
    rationale: 'The user is asking a simple follow-up question that can be answered directly.',
    experts: [],
    parallelizable: false,
    required_capabilities: ['conversational_reply'],
    fallback_allowed: false
  })

  it('parses embedded JSON strings', () => {
    const parsed = parseJsonish(routerOutput)
    expect(parsed).toMatchObject({ mode: 'direct', parallelizable: false })
  })

  it('builds readable fields for router LLM output', () => {
    const fields = buildDisplayFields(routerOutput)
    expect(fields.map(f => f.key)).toEqual([
      'mode',
      'rationale',
      'parallelizable',
      'required_capabilities',
      'fallback_allowed'
    ])
    expect(fields.find(f => f.key === 'mode')?.variant).toBe('badge')
    expect(fields.find(f => f.key === 'rationale')?.variant).toBe('prose')
    expect(fields.find(f => f.key === 'required_capabilities')?.variant).toBe('tags')
    expect(fields.find(f => f.key === 'parallelizable')?.variant).toBe('boolean')
  })

  it('detects structured displayability', () => {
    expect(isStructuredDisplayable(routerOutput)).toBe(true)
    expect(isStructuredDisplayable('plain text answer')).toBe(false)
  })

  it('keeps copy text as pretty JSON', () => {
    const copy = copyTextForValue(routerOutput)
    expect(copy).toContain('"mode": "direct"')
    expect(copy).toContain('rationale')
  })

  it('strips duplicate llm metadata from the details section', () => {
    const remaining = detailWithoutLlmMeta({
      type: 'llm_call',
      model: 'gpt-5.4',
      stage: 'router_llm',
      prompt_tokens: 6776,
      finish_reason: 'stop',
      plan: { mode: 'direct' }
    })
    expect(remaining).toEqual({ plan: { mode: 'direct' } })
  })

  it('humanizes snake_case keys', () => {
    expect(humanizeKey('required_capabilities')).toBe('Required Capabilities')
  })
})
