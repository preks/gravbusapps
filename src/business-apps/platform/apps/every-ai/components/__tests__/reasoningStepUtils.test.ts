import type { OutputItem, ReasoningStepOutput } from '../../types/models'
import {
  REASONING_KIND_LABEL,
  REASONING_STATUS_STYLE,
  extractCodeHint,
  extractStepReason,
  formatReasoningDuration,
  isTurnComplete,
  prettifyJson,
  selectInlineReasoningStepIds
} from '../reasoningStepUtils'

describe('REASONING_KIND_LABEL', () => {
  it('exposes a short label for every reasoning step kind', () => {
    // If a new kind is added on the backend, this test forces us to also
    // add its label so the UI doesn't silently render an empty header.
    const expectedKinds = [
      'tool_call',
      'handoff',
      'graphql_generate',
      'graphql_execute',
      'internal_search',
      'rag_lookup',
      'thought'
    ] as const

    expectedKinds.forEach(kind => {
      expect(REASONING_KIND_LABEL[kind]).toBeTruthy()
    })
  })

  it('groups GraphQL generate/execute under the same human label', () => {
    expect(REASONING_KIND_LABEL.graphql_generate).toBe(REASONING_KIND_LABEL.graphql_execute)
  })
})

describe('REASONING_STATUS_STYLE', () => {
  it('returns a distinct class for each status', () => {
    const classes = new Set([REASONING_STATUS_STYLE.running, REASONING_STATUS_STYLE.done, REASONING_STATUS_STYLE.error])
    expect(classes.size).toBe(3)
  })
})

describe('formatReasoningDuration', () => {
  it('returns null when timestamps are missing', () => {
    expect(formatReasoningDuration()).toBeNull()
    expect(formatReasoningDuration(1, undefined)).toBeNull()
    expect(formatReasoningDuration(undefined, 1)).toBeNull()
    expect(formatReasoningDuration(null, null)).toBeNull()
  })

  it('formats sub-second deltas in milliseconds', () => {
    expect(formatReasoningDuration(1000, 1000.25)).toBe('250 ms')
    expect(formatReasoningDuration(0, 0.001)).toBe('1 ms')
  })

  it('formats short steps with one decimal of seconds', () => {
    expect(formatReasoningDuration(0, 1.234)).toBe('1.2 s')
    expect(formatReasoningDuration(0, 9.94)).toBe('9.9 s')
  })

  it('formats long steps as integer seconds', () => {
    expect(formatReasoningDuration(0, 12.7)).toBe('13 s')
    expect(formatReasoningDuration(100, 130.4)).toBe('30 s')
  })

  it('clamps negative deltas to zero rather than negative-time', () => {
    expect(formatReasoningDuration(10, 5)).toBe('0 ms')
  })
})

describe('prettifyJson', () => {
  it('returns empty string for null/undefined', () => {
    expect(prettifyJson(undefined)).toBe('')
    expect(prettifyJson(null)).toBe('')
  })

  it('returns string values verbatim (no extra quoting)', () => {
    expect(prettifyJson('query { ok }')).toBe('query { ok }')
  })

  it('pretty-prints objects with two-space indentation', () => {
    const text = prettifyJson({ a: 1, b: { c: 2 } })
    expect(text).toContain('"a": 1')
    expect(text).toContain('"b":')
    expect(text.split('\n').length).toBeGreaterThan(1)
  })

  it('falls back to String() for circular structures', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const out = prettifyJson(circular)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('extractCodeHint', () => {
  it('returns null when payload is not an object', () => {
    expect(extractCodeHint('graphql_execute', null)).toBeNull()
    expect(extractCodeHint('graphql_execute', 'plain string')).toBeNull()
    expect(extractCodeHint('graphql_execute', 42)).toBeNull()
  })

  it('returns null when no recognised key is present', () => {
    expect(extractCodeHint('graphql_execute', { foo: 'bar' })).toBeNull()
  })

  it('extracts GraphQL queries for graphql_* and tool_call kinds', () => {
    const payload = { query: 'query { ok }', other: 1 }
    expect(extractCodeHint('graphql_execute', payload)).toEqual({
      language: 'graphql',
      code: 'query { ok }'
    })
    expect(extractCodeHint('graphql_generate', payload)).toEqual({
      language: 'graphql',
      code: 'query { ok }'
    })
    expect(extractCodeHint('tool_call', payload)).toEqual({
      language: 'graphql',
      code: 'query { ok }'
    })
  })

  it('prefers `query` over fallback aliases when both are present', () => {
    const payload = {
      query: 'query primary',
      final_query: 'query fallback',
      draft_query: 'query draft'
    }
    expect(extractCodeHint('graphql_execute', payload)).toEqual({
      language: 'graphql',
      code: 'query primary'
    })
  })

  it('falls back to `final_query` then `draft_query` then `graphql`', () => {
    expect(extractCodeHint('graphql_execute', { final_query: 'x' })).toEqual({
      language: 'graphql',
      code: 'x'
    })
    expect(extractCodeHint('graphql_execute', { draft_query: 'y' })).toEqual({
      language: 'graphql',
      code: 'y'
    })
    expect(extractCodeHint('graphql_execute', { graphql: 'z' })).toEqual({
      language: 'graphql',
      code: 'z'
    })
  })

  it('skips empty / whitespace-only candidate values', () => {
    expect(extractCodeHint('graphql_execute', { query: '   ', final_query: 'real query' })).toEqual({
      language: 'graphql',
      code: 'real query'
    })
  })

  it('uses the json language hint for non-graphql, non-tool kinds', () => {
    expect(extractCodeHint('rag_lookup', { query: 'find me employees' })).toEqual({
      language: 'json',
      code: 'find me employees'
    })
    expect(extractCodeHint('internal_search', { query: 'daniel' })).toEqual({
      language: 'json',
      code: 'daniel'
    })
  })
})

describe('isTurnComplete', () => {
  const reasoningStep: OutputItem = {
    type: 'reasoning_step',
    id: 'tc_1',
    kind: 'tool_call',
    title: 'lookup',
    status: 'done'
  } as OutputItem

  const toolChip: OutputItem = { type: 'tool', name: 'run_graphql_query', reason: 'lookup' } as OutputItem
  const loading: OutputItem = { type: 'loading' } as OutputItem
  const textDelta: OutputItem = { type: 'text_delta', delta: 'Hel' } as OutputItem

  const streamingAnswer = {
    type: 'answer',
    displayData: [{ type: 'textBlock', text: 'partial' }],
    nextStepProposals: [],
    __streaming: true
  } as unknown as OutputItem

  const finalAnswer = {
    type: 'answer',
    displayData: [{ type: 'textBlock', text: 'final' }],
    nextStepProposals: []
  } as unknown as OutputItem

  it('returns false for an empty turn', () => {
    expect(isTurnComplete([])).toBe(false)
  })

  it('returns false while only intermediate items are present', () => {
    expect(isTurnComplete([loading, toolChip, reasoningStep, textDelta])).toBe(false)
  })

  it('returns false for a streaming answer bubble (still in progress)', () => {
    expect(isTurnComplete([reasoningStep, streamingAnswer])).toBe(false)
  })

  it('returns true once a non-streaming answer arrives', () => {
    expect(isTurnComplete([reasoningStep, finalAnswer])).toBe(true)
  })

  it('returns true for non-answer terminal items (flow proposals, errors, …)', () => {
    const flowProposal = {
      type: 'flow_proposal',
      flow_name: 'createTask',
      module_name: 'tasks',
      flow_schema: {}
    } as unknown as OutputItem
    expect(isTurnComplete([reasoningStep, flowProposal])).toBe(true)

    const error = { type: 'error', text: 'boom' } as unknown as OutputItem
    expect(isTurnComplete([error])).toBe(true)
  })

  it('treats a streaming answer followed by a final answer as complete', () => {
    expect(isTurnComplete([reasoningStep, streamingAnswer, finalAnswer])).toBe(true)
  })

  it('ignores null / undefined entries safely', () => {
    expect(isTurnComplete([null as unknown as OutputItem, undefined as unknown as OutputItem, finalAnswer])).toBe(true)
    expect(isTurnComplete([null as unknown as OutputItem, reasoningStep])).toBe(false)
  })
})

describe('extractStepReason', () => {
  const baseStep: ReasoningStepOutput = {
    type: 'reasoning_step',
    id: 'rs_1',
    kind: 'tool_call',
    title: 'lookup',
    status: 'done'
  } as ReasoningStepOutput

  it('returns trimmed reason from args.reason', () => {
    const step = { ...baseStep, args: { reason: '  Finding teammates of Mike  ' } } as ReasoningStepOutput
    expect(extractStepReason(step)).toBe('Finding teammates of Mike')
  })

  it('prefers explicit narration over args.reason', () => {
    const step = {
      ...baseStep,
      narration: 'Narration text',
      args: { reason: 'Args reason' }
    } as ReasoningStepOutput
    expect(extractStepReason(step)).toBe('Narration text')
  })

  it('returns null when neither narration nor reason is present', () => {
    expect(extractStepReason(baseStep)).toBeNull()
    expect(extractStepReason({ ...baseStep, args: { query: 'test' } } as ReasoningStepOutput)).toBeNull()
  })

  it('returns null for empty/whitespace narration and reason', () => {
    expect(extractStepReason({ ...baseStep, narration: '   ' } as ReasoningStepOutput)).toBeNull()
    expect(extractStepReason({ ...baseStep, args: { reason: '' } } as ReasoningStepOutput)).toBeNull()
  })

  it('returns null when args is null or not an object', () => {
    expect(extractStepReason({ ...baseStep, args: null } as unknown as ReasoningStepOutput)).toBeNull()
    expect(extractStepReason({ ...baseStep, args: 42 } as unknown as ReasoningStepOutput)).toBeNull()
  })
})

describe('selectInlineReasoningStepIds', () => {
  const mkStep = (id: string): ReasoningStepOutput =>
    ({
      type: 'reasoning_step',
      id,
      kind: 'tool_call',
      title: 'step',
      status: 'running'
    }) as ReasoningStepOutput

  it('returns empty set when turn is complete', () => {
    const steps = [mkStep('a'), mkStep('b')]
    expect(selectInlineReasoningStepIds(steps, true).size).toBe(0)
  })

  it('selects only the last reasoning step while streaming', () => {
    const steps: OutputItem[] = [mkStep('a'), mkStep('b'), mkStep('c')]
    const result = selectInlineReasoningStepIds(steps, false)
    expect(result.size).toBe(1)
    expect(result.has('c')).toBe(true)
    expect(result.has('a')).toBe(false)
  })

  it('returns empty set when there are no reasoning steps', () => {
    const items: OutputItem[] = [{ type: 'loading' } as OutputItem]
    expect(selectInlineReasoningStepIds(items, false).size).toBe(0)
  })

  it('safely ignores null / undefined entries', () => {
    const items = [null, undefined, mkStep('x')]
    expect(selectInlineReasoningStepIds(items as OutputItem[], false).has('x')).toBe(true)
  })
})
