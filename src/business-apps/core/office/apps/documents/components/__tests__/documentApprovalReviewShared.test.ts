import {
  buildReviewDocument,
  fetchReviewContextForApproval,
  toPaginatedFormatting
} from '../documentApprovalReviewShared'
import type { Document, DocumentFormatting, DocumentReviewContext } from '../../types'
import { getDefaultPageLayout } from '../../utils/pageLayoutUtils'
import type { OfficeClient } from '@/common/network/office/OfficeClient'

const baseDocument: Document = {
  id: 'doc-1',
  title: 'Live title',
  content: '<p>live</p>',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  createdBy: 'user-1',
  settings: { key: 'live' } as Document['settings']
}

function makeReviewContext(snapshot: Record<string, unknown> | null, versionUnderReview = 3): DocumentReviewContext {
  return {
    liveDocument: baseDocument,
    reviewSnapshot: snapshot,
    reviewVersion: {
      versionNumber: versionUnderReview,
      createdAt: '2026-01-03T00:00:00Z',
      changedBy: 'user-1'
    },
    reviewUrl: '/review',
    approvalRequest: {
      id: 'approval-1',
      documentId: 'doc-1',
      versionAtRequest: versionUnderReview,
      status: 'pending',
      requestedBy: 'user-1',
      requestedAt: '2026-01-03T00:00:00Z',
      createdAt: '2026-01-03T00:00:00Z',
      approvers: []
    } as unknown as DocumentReviewContext['approvalRequest'],
    approvalMetadata: {} as DocumentReviewContext['approvalMetadata'],
    hasLiveChanges: false,
    canRespond: true,
    versionUnderReview,
    latestLiveVersion: versionUnderReview
  }
}

describe('toPaginatedFormatting', () => {
  it('forces pageless:false and falls back to defaults when formatting is undefined', () => {
    const result = toPaginatedFormatting(undefined)
    const defaults = getDefaultPageLayout()

    expect(result.pageless).toBe(false)
    expect(result.pageSize).toBe(defaults.pageSize)
    expect(result.orientation).toBe(defaults.orientation)
    expect(result.marginUnit).toBe(defaults.marginUnit)
    expect(result.pageColor).toBe(defaults.pageColor)
    expect(result.margins).toEqual(defaults.margins)
  })

  it('overrides a pageless:true source with pageless:false while preserving other fields', () => {
    const source: DocumentFormatting = {
      pageless: true,
      pageSize: 'A3',
      orientation: 'landscape',
      fontFamily: 'Inter',
      fontSize: 12,
      margins: { top: 1, right: 1.5, bottom: 1, left: 1.5 }
    }

    const result = toPaginatedFormatting(source)

    expect(result.pageless).toBe(false)
    expect(result.pageSize).toBe('A3')
    expect(result.orientation).toBe('landscape')
    expect(result.fontFamily).toBe('Inter')
    expect(result.fontSize).toBe(12)
    expect(result.margins).toEqual({ top: 1, right: 1.5, bottom: 1, left: 1.5 })
  })

  it('keeps partial margins object from source instead of replacing it with defaults', () => {
    const source: DocumentFormatting = {
      pageless: true,
      margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }
    }

    expect(toPaginatedFormatting(source).margins).toEqual({ top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 })
  })
})

describe('buildReviewDocument', () => {
  it('returns null when the review snapshot is missing', () => {
    const result = buildReviewDocument(baseDocument, makeReviewContext(null))
    expect(result).toBeNull()
  })

  it('forces paginated formatting even when the snapshot is pageless', () => {
    const snapshot = {
      id: 'snapshot-doc',
      title: 'Snapshot title',
      content: '<p>snapshot</p>',
      formatting: { pageless: true, pageSize: 'A4' } as DocumentFormatting,
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z'
    }

    const result = buildReviewDocument(baseDocument, makeReviewContext(snapshot))

    expect(result).not.toBeNull()
    expect(result?.formatting?.pageless).toBe(false)
    expect(result?.formatting?.pageSize).toBe('A4')
  })

  it('uses base document id/status/owner when building the review document', () => {
    const snapshot = {
      id: 'snapshot-doc',
      title: 'Snapshot title',
      content: '<p>snapshot</p>',
      status: 'approved',
      ownerId: 'someone-else',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z'
    }

    const result = buildReviewDocument(baseDocument, makeReviewContext(snapshot, 5))

    expect(result?.id).toBe(baseDocument.id)
    expect(result?.status).toBe(baseDocument.status)
    expect(result?.createdBy).toBe(baseDocument.createdBy)
  })

  it('falls back to snapshot id/status/owner when no base document is provided', () => {
    const snapshot = {
      id: 'snapshot-doc',
      title: 'Snapshot title',
      content: '<p>snapshot</p>',
      status: 'pending_approval',
      ownerId: 'snapshot-owner',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z'
    }

    const result = buildReviewDocument(null, makeReviewContext(snapshot, 5))

    expect(result?.id).toBe('snapshot-doc')
    expect(result?.status).toBe('pending_approval')
    expect(result?.createdBy).toBe('snapshot-owner')
  })
})

describe('fetchReviewContextForApproval', () => {
  function makeClient(
    approvalResponse: Record<string, unknown>,
    reviewResponse: DocumentReviewContext
  ): {
    client: OfficeClient
    getApprovalRequest: jest.Mock
    getReviewContext: jest.Mock
  } {
    const getApprovalRequest = jest.fn().mockResolvedValue(approvalResponse)
    const getReviewContext = jest.fn().mockResolvedValue(reviewResponse)
    const client = {
      documents: { getApprovalRequest, getReviewContext }
    } as unknown as OfficeClient
    return { client, getApprovalRequest, getReviewContext }
  }

  it('resolves document id from the raw entityType/entityId backend shape', async () => {
    const reviewContext = makeReviewContext({
      id: 'snapshot-doc',
      title: 'Snapshot title',
      content: '<p>snapshot</p>'
    })
    const { client, getReviewContext } = makeClient(
      {
        id: 'approval-1',
        entityType: 'document',
        entityId: 'doc-xyz',
        versionAtRequest: 4,
        status: 'pending'
      },
      reviewContext
    )

    const result = await fetchReviewContextForApproval(client, 'approval-1')

    expect(getReviewContext).toHaveBeenCalledWith('doc-xyz', 4)
    expect(result.approvalRequest.documentId).toBe('doc-xyz')
    expect(result.reviewContext).toBe(reviewContext)
  })

  it('uses documentId directly when the payload already exposes it', async () => {
    const reviewContext = makeReviewContext({
      id: 'snapshot-doc',
      title: 'Snapshot title',
      content: '<p>snapshot</p>'
    })
    const { client, getReviewContext } = makeClient(
      {
        id: 'approval-2',
        documentId: 'doc-abc',
        versionAtRequest: 2,
        status: 'pending'
      },
      reviewContext
    )

    const result = await fetchReviewContextForApproval(client, 'approval-2')

    expect(getReviewContext).toHaveBeenCalledWith('doc-abc', 2)
    expect(result.approvalRequest.documentId).toBe('doc-abc')
  })

  it('throws approval-request-missing-document when neither documentId nor entityId is set', async () => {
    const { client } = makeClient(
      {
        id: 'approval-3',
        entityType: 'other',
        versionAtRequest: 1,
        status: 'pending'
      },
      makeReviewContext(null)
    )

    await expect(fetchReviewContextForApproval(client, 'approval-3')).rejects.toThrow(
      'approval-request-missing-document'
    )
  })

  it('throws approval-request-missing-version when versionAtRequest is missing or invalid', async () => {
    const { client } = makeClient(
      {
        id: 'approval-4',
        entityType: 'document',
        entityId: 'doc-xyz',
        status: 'pending'
      },
      makeReviewContext(null)
    )

    await expect(fetchReviewContextForApproval(client, 'approval-4')).rejects.toThrow(
      'approval-request-missing-version'
    )
  })
})
