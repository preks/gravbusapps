import {
  normalizeEmailSummarizeSuggestion,
  normalizeMessageSummaryResult,
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
})
