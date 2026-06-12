import {
  CLARIFICATION_CANCEL_MESSAGE,
  CLARIFICATION_RESPONSE_MESSAGE,
  SUBMITTING_FORM_MESSAGE,
  isNonRestorableUserDisplayMessage,
  isStructuredChatAction,
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

describe('isStructuredChatAction', () => {
  it('detects form submissions even when payload contains UPDATE and UUIDs', () => {
    const payload = JSON.stringify({
      action: 'form_submission',
      uuid: '29a569ff-1845-47f5-9782-e1a01e624b55',
      flow_name: 'changeAddress',
      module_name: 'employee',
      data: {
        flow: {
          changeMode: 'UPDATE',
          employeeId: 'fed69036-2994-4fd0-991d-b89b7506f2e9',
          address: { type: 'PRIMARY', locality: 'Magdeburg' }
        }
      }
    })
    expect(isStructuredChatAction(payload)).toBe(true)
  })

  it('detects form cancel and clarification actions', () => {
    expect(isStructuredChatAction(JSON.stringify({ action: 'form_cancel', uuid: 'x' }))).toBe(true)
    expect(isStructuredChatAction(JSON.stringify({ action: 'clarification_response', interrupt_id: 'i' }))).toBe(true)
    expect(isStructuredChatAction(JSON.stringify({ action: 'clarification_cancel', interrupt_id: 'i' }))).toBe(true)
  })

  it('returns false for plain text and unrelated JSON', () => {
    expect(isStructuredChatAction('Please update my address')).toBe(false)
    expect(isStructuredChatAction(JSON.stringify({ changeMode: 'UPDATE' }))).toBe(false)
  })
})
