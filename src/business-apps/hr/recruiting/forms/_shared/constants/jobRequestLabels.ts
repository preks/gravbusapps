/**
 * Shared label constants for Job Request forms
 * Prevents duplication and ensures consistency across recruiting forms
 */

export const JOB_REQUEST_LABELS = {
  // Date fields
  plannedHiringDate: 'Planned Hiring Date',
  plannedExitDate: 'Planned Exit Date',

  // Placeholders
  plannedHiringDatePlaceholder: 'Select planned hiring date...',
  plannedExitDatePlaceholder: 'Select planned exit date...',

  // Other common labels
  organizationalUnit: 'Organizational Unit',
  requester: 'Requester',
  requestType: 'Request Type',
  requestName: 'Request Name',
  description: 'Description',
  contractType: 'Contract Type',
  employmentType: 'Employment Type',
  experienceLevel: 'Experience Level',
  company: 'Company',
  costCenter: 'Cost Center',
  siteLocation: 'Site Location',
  status: 'Status',
  amount: 'Amount',

  // Job Position/Profile
  jobPositionReplacement: 'Job Position (Replacement)',
  jobProfileNew: 'Job Profile (New Position)'
} as const

export type JobRequestLabel = (typeof JOB_REQUEST_LABELS)[keyof typeof JOB_REQUEST_LABELS]
