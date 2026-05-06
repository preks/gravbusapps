import {
  normalizeEmailSummarizeSuggestion,
  normalizeMessageSummaryResult,
  normalizeStringList,
  normalizeSuggestionsArray
} from './emailSummarizeSuggestionNormalize'

describe('emailSummarizeSuggestionNormalize', () => {
  it('drops entries without title', () => {
    expect(normalizeEmailSummarizeSuggestion({ type: 'task', title: '   ' })).toBeNull()
    expect(normalizeSuggestionsArray([{ type: 'task', title: 'Ok' }])).toHaveLength(1)
  })

  it('preserves integrationTarget and metadata', () => {
    const s = normalizeEmailSummarizeSuggestion({
      type: 'meeting',
      title: 'Call',
      integrationTarget: 'calendar',
      metadata: { activitySubtype: 'planning', n: 1 }
    })
    expect(s?.integrationTarget).toBe('calendar')
    expect(s?.metadata).toEqual({ activitySubtype: 'planning', n: '1' })
  })

  it('normalizes message summary result with missing suggestions', () => {
    const r = normalizeMessageSummaryResult({ summary: 'Hi', suggestions: null })
    expect(r.summary).toBe('Hi')
    expect(r.suggestions).toEqual([])
  })

  it('preserves boolean explicit values and omits non-boolean values', () => {
    expect(normalizeEmailSummarizeSuggestion({ type: 'task', title: 'Explicit', explicit: true })?.explicit).toBe(true)
    expect(normalizeEmailSummarizeSuggestion({ type: 'task', title: 'Implicit', explicit: false })?.explicit).toBe(
      false
    )
    expect(
      normalizeEmailSummarizeSuggestion({ type: 'task', title: 'Invalid', explicit: 'true' })?.explicit
    ).toBeUndefined()
  })

  it('trims, filters, and caps string lists', () => {
    expect(normalizeStringList(['  first  ', '', 42, 'second', 'third', 'fourth'], 3)).toEqual([
      'first',
      'second',
      'third'
    ])
  })

  it('preserves normalized important dates and open questions', () => {
    const s = normalizeEmailSummarizeSuggestion({
      type: 'task',
      title: 'Follow up',
      importantDates: [' tomorrow ', null, 'next Friday'],
      openQuestions: [' Who signs? ', '', false]
    })

    expect(s?.importantDates).toEqual(['tomorrow', 'next Friday'])
    expect(s?.openQuestions).toEqual(['Who signs?'])
  })

  it('omits invalid list values', () => {
    const s = normalizeEmailSummarizeSuggestion({
      type: 'task',
      title: 'No lists',
      importantDates: 'tomorrow',
      openQuestions: [null, '', 1]
    })

    expect(s?.importantDates).toBeUndefined()
    expect(s?.openQuestions).toBeUndefined()
  })
})
