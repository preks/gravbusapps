import { buildEntityPayload, entityStatusBadgeVariant, jobStateBadgeVariant, parseJsonField } from './utils'

describe('global search manager utils', () => {
  it('builds entity payload with normalized entity type and parsed JSON config', () => {
    const payload = buildEntityPayload({
      entityType: ' task ',
      entityTypeLabel: 'Task',
      categoryKey: 'WORK',
      categoryLabel: 'Work',
      kind: 'RECORD',
      icon: '',
      accessControlType: 'PUBLIC',
      active: true,
      sortOrder: '4',
      actionConfig: '{"endpoint":"/tasks/{id}"}',
      searchConfig: '{"source":{"from":"public.task t"}}'
    })

    expect(payload.entityType).toBe('TASK')
    expect(payload.icon).toBe('search')
    expect(payload.sortOrder).toBe(4)
    expect(payload.actionConfig).toEqual({ endpoint: '/tasks/{id}' })
    expect(payload.searchConfig).toEqual({ source: { from: 'public.task t' } })
  })

  it('rejects invalid JSON fields', () => {
    expect(() => parseJsonField('{', 'Search config')).toThrow('Search config must be valid JSON')
    expect(() => parseJsonField('[]', 'Search config')).toThrow('Search config must be a JSON object')
  })

  it('maps job state badge variants', () => {
    expect(jobStateBadgeVariant('completed')).toBe('success')
    expect(jobStateBadgeVariant('failed')).toBe('destructive')
    expect(jobStateBadgeVariant('active')).toBe('info')
    expect(jobStateBadgeVariant('wait')).toBe('secondary')
  })

  it('maps entity status badge variants', () => {
    expect(entityStatusBadgeVariant(true)).toBe('success')
    expect(entityStatusBadgeVariant(false)).toBe('secondary')
  })
})
