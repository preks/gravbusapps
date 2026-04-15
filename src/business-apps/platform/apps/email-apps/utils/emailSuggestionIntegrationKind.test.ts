import { parseAssigneeUserIdsFromMetadata, resolveSuggestionIntegrationKind } from './emailSuggestionIntegrationKind'

describe('resolveSuggestionIntegrationKind', () => {
  it('treats blink and flow_engine as quickTask', () => {
    expect(resolveSuggestionIntegrationKind('blink')).toBe('quickTask')
    expect(resolveSuggestionIntegrationKind('flow_engine')).toBe('quickTask')
    expect(resolveSuggestionIntegrationKind('flow-engine')).toBe('quickTask')
  })

  it('treats calendar as calendarStub', () => {
    expect(resolveSuggestionIntegrationKind('calendar')).toBe('calendarStub')
  })

  it('treats customer_relations, generic, and unknown as crm', () => {
    expect(resolveSuggestionIntegrationKind('customer_relations')).toBe('crm')
    expect(resolveSuggestionIntegrationKind('generic')).toBe('crm')
    expect(resolveSuggestionIntegrationKind(undefined)).toBe('crm')
    expect(resolveSuggestionIntegrationKind('other_system')).toBe('crm')
  })
})

describe('parseAssigneeUserIdsFromMetadata', () => {
  it('reads assigneeUserId, assignedUserId, and comma-separated assigneeUserIds', () => {
    expect(
      parseAssigneeUserIdsFromMetadata({
        assigneeUserId: ' u1 ',
        assignedUserId: 'u2',
        assigneeUserIds: ' u3 , u4 '
      })
    ).toEqual(['u1', 'u2', 'u3', 'u4'])
  })

  it('deduplicates', () => {
    expect(
      parseAssigneeUserIdsFromMetadata({
        assigneeUserId: 'same',
        assignedUserId: 'same'
      })
    ).toEqual(['same'])
  })
})
