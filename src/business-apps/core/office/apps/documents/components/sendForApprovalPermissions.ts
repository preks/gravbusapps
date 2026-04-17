import type { DocumentShare } from '../types'

type ExistingDocumentShare = Pick<DocumentShare, 'userId'> & Partial<Pick<DocumentShare, 'permission'>>

export function getApproverUserIdsNeedingShare(
  approverUserIds: string[],
  existingShares: ExistingDocumentShare[]
): string[] {
  const existingSharedUserIds = new Set(existingShares.map(share => share.userId).filter(Boolean))
  const uniqueApproverUserIds = Array.from(new Set(approverUserIds.filter(Boolean)))

  return uniqueApproverUserIds.filter(userId => !existingSharedUserIds.has(userId))
}
