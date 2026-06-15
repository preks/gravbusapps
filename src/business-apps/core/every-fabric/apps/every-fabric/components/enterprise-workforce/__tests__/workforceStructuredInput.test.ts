import { getStructuredInputPending } from '../workforceStructuredInput'

describe('getStructuredInputPending', () => {
  it('returns null for empty input', () => {
    expect(getStructuredInputPending(null)).toBeNull()
    expect(getStructuredInputPending(undefined)).toBeNull()
    expect(getStructuredInputPending({})).toBeNull()
  })

  it('ignores compose_email (handled separately)', () => {
    expect(getStructuredInputPending({ form_id: 'compose_email', email_draft: {} })).toBeNull()
  })

  it('returns null for a plain free-text question with no fields', () => {
    expect(getStructuredInputPending({ form_id: 'ask_human', title: 'Question' })).toBeNull()
  })

  it('returns the form for a field-based structured request', () => {
    const result = getStructuredInputPending({
      form_id: 'approve-patch',
      title: 'Approve proposed patch',
      description: 'Review the changes',
      allow_partial_submit: true,
      fields: [{ field_id: 'decision', label: 'Decision', field_type: 'select', required: true }]
    })

    expect(result).not.toBeNull()
    expect(result?.form_id).toBe('approve-patch')
    expect(result?.title).toBe('Approve proposed patch')
    expect(result?.fields).toHaveLength(1)
    expect(result?.allow_partial_submit).toBe(true)
    expect(result?.type).toBe('structured_input_request')
  })

  it('returns tool_permission_request even without fields', () => {
    const result = getStructuredInputPending({
      form_id: 'tool_permission_request',
      action_requests: [{ name: 'update_contract' }]
    })

    expect(result).not.toBeNull()
    expect(result?.form_id).toBe('tool_permission_request')
    expect(result?.fields).toEqual([])
  })

  it('fills safe defaults for missing optional metadata', () => {
    const result = getStructuredInputPending({
      form_id: 'approve-patch',
      fields: [{ field_id: 'note', label: 'Note', field_type: 'text', required: false }]
    })

    expect(result?.title).toBe('Awaiting your input')
    expect(result?.description).toBe('')
    expect(result?.allow_partial_submit).toBe(false)
    expect(result?.seq).toBe(0)
  })
})
