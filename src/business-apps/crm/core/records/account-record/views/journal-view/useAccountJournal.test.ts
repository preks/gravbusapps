import { buildAccountJournalEntries, isApprovalTask } from './useAccountJournal'

describe('account journal normalization', () => {
  it('normalizes activities, notes, tasks and approvals into one createdAt-sorted feed', () => {
    const entries = buildAccountJournalEntries({
      activities: [
        {
          id: 'activity-1',
          title: 'Called customer',
          description: 'Discussed renewal',
          createdAt: '2026-01-02T10:00:00.000Z',
          ownerEmployee: { displayName: 'Activity Owner' }
        } as any
      ],
      notes: [
        {
          id: 'note-1',
          noteTitle: 'Follow-up note',
          noteText: 'Send summary',
          createdAt: '2026-01-04T10:00:00.000Z',
          authorEmployee: { firstName: 'Note', lastName: 'Author' }
        }
      ],
      tasks: [
        {
          id: 'task-1',
          name: 'Prepare offer',
          createdAt: '2026-01-03T10:00:00.000Z',
          creatorEmployee: { displayName: 'Task Creator' }
        } as any,
        {
          id: 'approval-1',
          name: 'Approve discount',
          createdAt: '2026-01-05T10:00:00.000Z',
          taskType: { code: 'APPROVAL' }
        } as any
      ]
    })

    expect(entries.map(entry => entry.id)).toEqual([
      'approval:approval-1',
      'note:note-1',
      'task:task-1',
      'activity:activity-1'
    ])
    expect(entries.map(entry => entry.type)).toEqual(['approval', 'note', 'task', 'activity'])
    expect(entries[1].actorName).toBe('Note Author')
  })

  it('detects approval tasks from type refs and catalog values', () => {
    expect(isApprovalTask({ id: 'a', taskTypeRef: 'SalesTaskType:v1:APPROVAL' } as any)).toBe(true)
    expect(isApprovalTask({ id: 'b', taskType: { value: 'Approval' } } as any)).toBe(true)
    expect(isApprovalTask({ id: 'c', taskType: { value: 'Follow up' } } as any)).toBe(false)
  })
})
