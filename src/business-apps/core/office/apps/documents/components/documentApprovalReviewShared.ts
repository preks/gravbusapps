import type { OfficeClient } from '@/common/network/office/OfficeClient'
import { mapApiDocumentToDocument } from '../utils/documentOfficeOperations'
import { getDefaultPageLayout } from '../utils/pageLayoutUtils'
import type { Document, DocumentApprovalRequest, DocumentFormatting, DocumentReviewContext } from '../types'

/**
 * Raw approval-request payload as returned by the document-service `/approvals/:id` endpoint.
 *
 * The frontend {@link DocumentApprovalRequest} type exposes a `documentId` convenience field, but
 * the raw API response uses `entityType` + `entityId`. We accept both shapes so this helper
 * works against either.
 */
interface RawApprovalRequestResponse extends Partial<DocumentApprovalRequest> {
  entityType?: string
  entityId?: string
}

/**
 * Extracts the associated document id from an approval request regardless of whether the
 * payload uses the frontend shape (`documentId`) or the raw backend shape
 * (`entityType: 'document'` + `entityId`).
 */
function resolveDocumentIdFromApproval(approvalRequest: RawApprovalRequestResponse): string | null {
  if (approvalRequest.documentId) {
    return approvalRequest.documentId
  }
  if (approvalRequest.entityType?.toLowerCase() === 'document' && approvalRequest.entityId) {
    return approvalRequest.entityId
  }
  return null
}

/**
 * Loads the approval request (by id), extracts the document id + version-under-review,
 * and returns the matching review context snapshot.
 * Used by callers that only hold an approval request id (for example Every Box task drawer).
 */
export async function fetchReviewContextForApproval(
  client: OfficeClient,
  approvalRequestId: string
): Promise<{ approvalRequest: DocumentApprovalRequest; reviewContext: DocumentReviewContext }> {
  const rawApprovalRequest = await client.documents.getApprovalRequest<RawApprovalRequestResponse>(approvalRequestId)

  const documentId = resolveDocumentIdFromApproval(rawApprovalRequest)
  if (!documentId) {
    throw new Error('approval-request-missing-document')
  }

  const version = rawApprovalRequest.versionAtRequest
  if (!Number.isInteger(version) || !version || version < 1) {
    throw new Error('approval-request-missing-version')
  }

  const reviewContext = await client.documents.getReviewContext<DocumentReviewContext>(documentId, version)

  return {
    approvalRequest: {
      ...(rawApprovalRequest as DocumentApprovalRequest),
      documentId
    },
    reviewContext
  }
}

/**
 * Builds the read-only `Document` for the review snapshot.
 *
 * The preview is intentionally paginated regardless of the source formatting so that
 * approvers see a consistent, print-like view of the version under review. Missing layout
 * fields fall back to {@link getDefaultPageLayout} so `getPaginationConfigFromFormatting`
 * never returns `null`.
 */
export function buildReviewDocument(
  baseDocument: Pick<Document, 'id' | 'status' | 'createdBy' | 'settings' | 'sourceFile'> | null,
  reviewContext: DocumentReviewContext
): Document | null {
  if (!reviewContext.reviewSnapshot) {
    return null
  }

  const snapshot = reviewContext.reviewSnapshot
  const snapshotSettings = snapshot.settings as Document['settings'] | undefined
  const snapshotSourceFileInfo = snapshot.sourceFileInfo as Record<string, unknown> | undefined

  const mapped = mapApiDocumentToDocument({
    ...snapshot,
    id: baseDocument?.id ?? (snapshot.id as string | undefined) ?? '',
    status: baseDocument?.status ?? snapshot.status,
    ownerId: baseDocument?.createdBy ?? snapshot.ownerId,
    currentVersion: reviewContext.versionUnderReview,
    settings: snapshotSettings ?? baseDocument?.settings,
    sourceFileInfo: snapshotSourceFileInfo ?? baseDocument?.sourceFile
  })

  return {
    ...mapped,
    formatting: toPaginatedFormatting(mapped.formatting)
  }
}

/**
 * Ensures the resulting formatting renders as a paginated document: fills defaults for
 * missing layout fields and forces `pageless: false`.
 */
export function toPaginatedFormatting(formatting?: DocumentFormatting | null): DocumentFormatting {
  const defaults = getDefaultPageLayout()
  return {
    ...defaults,
    ...(formatting ?? {}),
    margins: formatting?.margins ?? defaults.margins,
    pageless: false
  }
}
