/**
 * RequisitionStatus Enum
 * Status values for job requisitions
 */
export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export const REQUISITION_STATUS_OPTIONS = [
  { value: RequisitionStatus.DRAFT, label: 'Draft' },
  { value: RequisitionStatus.SUBMITTED, label: 'Submitted' },
  { value: RequisitionStatus.APPROVED, label: 'Approved' },
  { value: RequisitionStatus.REJECTED, label: 'Rejected' }
] as const
