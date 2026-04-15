import type { EmailSummarizeSuggestion } from '../types'
import {
  formatSuggestionConfidence,
  hashString,
  serializeMetadataForStableKey,
  stableEmailSuggestionKey,
  stableKeyPointKey
} from './emailSummarizeSuggestionUtils'

describe('emailSummarizeSuggestionUtils', () => {
  it('stableEmailSuggestionKey differs when title changes', () => {
    const a: EmailSummarizeSuggestion = { type: 'task', title: 'One' }
    const b: EmailSummarizeSuggestion = { type: 'task', title: 'Two' }
    expect(stableEmailSuggestionKey(a)).not.toBe(stableEmailSuggestionKey(b))
  })

  it('stableEmailSuggestionKey includes integrationTarget and metadata', () => {
    const a: EmailSummarizeSuggestion = { type: 'task', title: 'T', integrationTarget: 'blink' }
    const b: EmailSummarizeSuggestion = {
      type: 'task',
      title: 'T',
      metadata: { k: 'v' }
    }
    expect(stableEmailSuggestionKey(a)).toContain('blink')
    expect(stableEmailSuggestionKey(b)).toContain('k=v')
  })

  it('formatSuggestionConfidence maps 0–1 to percent string', () => {
    expect(formatSuggestionConfidence(0.85)).toBe('85%')
  })

  it('formatSuggestionConfidence maps 1–100 to rounded percent', () => {
    expect(formatSuggestionConfidence(87.3)).toBe('87%')
  })

  it('stableKeyPointKey is deterministic', () => {
    expect(stableKeyPointKey('alpha')).toBe(stableKeyPointKey('alpha'))
    expect(stableKeyPointKey('alpha')).not.toBe(stableKeyPointKey('beta'))
  })

  it('hashString is deterministic', () => {
    expect(hashString('x')).toBe(hashString('x'))
  })

  it('serializeMetadataForStableKey sorts keys', () => {
    expect(serializeMetadataForStableKey({ b: '2', a: '1' })).toBe('a=1|b=2')
  })
})
