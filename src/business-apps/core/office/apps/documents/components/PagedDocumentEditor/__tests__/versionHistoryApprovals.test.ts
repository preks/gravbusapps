import { buildVersionHistoryApprovalSummary, type DocumentApprovalHistoryRequest } from '../versionHistoryApprovals'

describe('buildVersionHistoryApprovalSummary', () => {
  it('builds counts, approver details, and review access by version', () => {
    const approvals: DocumentApprovalHistoryRequest[] = [
      {
        id: 'pending-request',
        requestedBy: 'requester-1',
        status: 'pending',
        versionAtRequest: 8,
        createdAt: '2026-04-16T09:00:00.000Z',
        steps: [
          { approverId: 'reviewer-1', status: 'pending' },
          { approverId: 'reviewer-2', status: 'approved', respondedAt: '2026-04-16T09:30:00.000Z' }
        ]
      },
      {
        id: 'approved-request',
        requestedBy: 'requester-2',
        requestedByName: 'Kim Reviewer',
        status: 'approved',
        versionAtRequest: 5,
        createdAt: '2026-04-15T12:00:00.000Z',
        steps: [
          {
            approverId: 'reviewer-3',
            status: 'approved',
            respondedAt: '2026-04-15T13:00:00.000Z',
            comments: 'Looks good.'
          }
        ]
      },
      {
        id: 'older-request-same-version',
        requestedBy: 'requester-3',
        status: 'rejected',
        versionAtRequest: 8,
        createdAt: '2026-04-14T08:00:00.000Z',
        steps: [{ approverId: 'reviewer-4', status: 'rejected', respondedAt: '2026-04-14T09:00:00.000Z' }]
      }
    ]

    const summary = buildVersionHistoryApprovalSummary(approvals, 'reviewer-1')

    expect(summary.pendingCount).toBe(1)
    expect(summary.approvedCount).toBe(1)
    expect(summary.approvalUserIds.sort()).toEqual([
      'requester-1',
      'requester-2',
      'requester-3',
      'reviewer-1',
      'reviewer-2',
      'reviewer-3',
      'reviewer-4'
    ])
    expect(summary.approvalDetailsByVersion[8]).toEqual({
      requestId: 'pending-request',
      requestStatus: 'pending',
      requestedBy: 'requester-1',
      requestedByName: undefined,
      requestedByPicture: undefined,
      requestedAt: '2026-04-16T09:00:00.000Z',
      reviewers: [
        { userId: 'reviewer-1', status: 'pending', respondedAt: undefined },
        { userId: 'reviewer-2', status: 'approved', respondedAt: '2026-04-16T09:30:00.000Z' }
      ],
      canReview: true
    })
    expect(summary.approvalDetailsByVersion[5]).toEqual({
      requestId: 'approved-request',
      requestStatus: 'approved',
      requestedBy: 'requester-2',
      requestedByName: 'Kim Reviewer',
      requestedByPicture: undefined,
      requestedAt: '2026-04-15T12:00:00.000Z',
      reviewers: [
        { userId: 'reviewer-3', status: 'approved', respondedAt: '2026-04-15T13:00:00.000Z', comments: 'Looks good.' }
      ],
      canReview: false
    })
  })
})
