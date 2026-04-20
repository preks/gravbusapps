import { getApproverUserIdsNeedingShare } from '../sendForApprovalPermissions'

describe('getApproverUserIdsNeedingShare', () => {
  it('skips approvers who already have direct shares regardless of permission', () => {
    const result = getApproverUserIdsNeedingShare(
      ['user-view', 'user-comment', 'user-edit', 'user-missing'],
      [
        {
          userId: 'user-view',
          permission: 'view'
        },
        {
          userId: 'user-comment',
          permission: 'comment'
        },
        {
          userId: 'user-edit',
          permission: 'edit'
        }
      ]
    )

    expect(result).toEqual(['user-missing'])
  })

  it('deduplicates approvers before returning users that still need sharing', () => {
    const result = getApproverUserIdsNeedingShare(['user-a', 'user-a', 'user-b'], [{ userId: 'user-a' }])

    expect(result).toEqual(['user-b'])
  })
})
