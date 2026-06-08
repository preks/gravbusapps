import {
  CLARIFICATION_CANCEL_MESSAGE,
  CLARIFICATION_RESPONSE_MESSAGE,
  SUBMITTING_FORM_MESSAGE,
  isNonRestorableUserDisplayMessage,
  resolveUserMessageDisplayText
} from './userMessageDisplay'

describe('resolveUserMessageDisplayText', () => {
  it('returns plain text unchanged', () => {
    expect(resolveUserMessageDisplayText('Hello team')).toBe('Hello team')
  })

  it('maps form submissions to the submitting label', () => {
    const payload = JSON.stringify({ action: 'form_submission', uuid: 'form-1', data: { name: 'Ada' } })
    expect(resolveUserMessageDisplayText(payload)).toBe(SUBMITTING_FORM_MESSAGE)
  })

  it('maps clarification responses to the answers-sent label', () => {
    const payload = JSON.stringify({
      action: 'clarification_response',
      interrupt_id: 'interrupt-1',
      data: { fields: 'all' }
    })
    expect(resolveUserMessageDisplayText(payload)).toBe(CLARIFICATION_RESPONSE_MESSAGE)
  })

  it('maps clarification cancellations to the skipped label', () => {
    const payload = JSON.stringify({
      action: 'clarification_cancel',
      interrupt_id: 'interrupt-1',
      data: {}
    })
    expect(resolveUserMessageDisplayText(payload)).toBe(CLARIFICATION_CANCEL_MESSAGE)
  })

  it('prefers an explicit userMessage when provided', () => {
    const payload = JSON.stringify({
      action: 'clarification_cancel',
      userMessage: 'Cancelled: Travel request'
    })
    expect(resolveUserMessageDisplayText(payload)).toBe('Cancelled: Travel request')
  })

  it('marks structured display labels as non-restorable on cancel', () => {
    expect(isNonRestorableUserDisplayMessage(SUBMITTING_FORM_MESSAGE)).toBe(true)
    expect(isNonRestorableUserDisplayMessage(CLARIFICATION_RESPONSE_MESSAGE)).toBe(true)
    expect(isNonRestorableUserDisplayMessage(CLARIFICATION_CANCEL_MESSAGE)).toBe(true)
    expect(isNonRestorableUserDisplayMessage('Draft the poem')).toBe(false)
  })
})
