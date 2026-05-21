/**
 * Onboarding Types
 *
 * Type definitions specific to the Employee Onboarding application.
 * Extends base CaseMetadata with onboarding-specific fields.
 */

import { CaseMetadata, StatusOption } from '@/business-apps/common/apps/case-management/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Case, CaseAnalytics } from '@/business-apps/common/apps/case-management/types'

/**
 * Work location options
 */
export type WorkLocation = 'office' | 'remote' | 'hybrid'

/**
 * Extended metadata for onboarding cases
 */
export interface OnboardingMetadata extends CaseMetadata {
  // Employee information
  employeeId?: string
  employeeUserId?: string
  employeeName: string
  position: string
  department: string
  jobPositionId?: string
  jobPositionName?: string
  organizationalUnitId?: string
  organizationName?: string
  managerId?: string

  // Onboarding details
  startDate: string
  mentorId?: string
  workLocation: WorkLocation

  // Equipment & access
  equipmentRequested?: string[]
  equipmentCompleted?: string[]
  accessRequested?: string[]
  accessGranted?: string[]

  // Tracking
  welcomeEmailSent?: boolean
  documentsCompleted?: string[]
  trainingCompleted?: string[]
}

/**
 * Form data for creating new onboarding case
 */
export interface OnboardingFormData {
  employeeName: string
  position: string
  department: string
  startDate: string
  managerId: string
  mentorId: string
  workLocation: WorkLocation
  equipmentPackage: string[]
}

export interface CreateOnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCaseCreated: (caseId: string) => void
  defaultFlowTemplates?: string[]
  context: BusinessAppContextProps
  appTag: string
  userId?: string
}

export interface OnboardingKPICardsProps {
  analytics: CaseAnalytics | null
  isLoading: boolean
}

export interface OnboardingDetailsPanelProps {
  caseData: Case
  metadata: OnboardingMetadata
  linkedFlows: Case['state']['linkedFlows']
  context: BusinessAppContextProps
  employeeProfile?: {
    displayName?: string
    fullName?: string
    preferredName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: { name?: string }
      organizationalUnit?: { id?: string; name?: string }
    }
  } | null
  isLoadingEmployeeProfile?: boolean
}

export interface OnboardingEmptyStateProps {
  view: 'dashboard' | 'list'
  onCreateCase: () => void
}

/**
 * Status options with onboarding-specific labels
 */
export const onboardingStatusOptions: StatusOption[] = [
  { value: 'open', label: 'Pending Start', color: 'blue' },
  { value: 'in_progress', label: 'Onboarding', color: 'amber' },
  { value: 'blocked', label: 'On Hold', color: 'red' },
  { value: 'completed', label: 'Onboarded', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' }
]

/**
 * Equipment options for onboarding
 */
export const equipmentOptions = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'headset', label: 'Headset' },
  { value: 'webcam', label: 'Webcam' },
  { value: 'docking_station', label: 'Docking Station' },
  { value: 'mobile_phone', label: 'Mobile Phone' }
]

/**
 * Access request options
 */
export const accessOptions = [
  { value: 'email', label: 'Email Account' },
  { value: 'active_directory', label: 'Active Directory' },
  { value: 'vpn', label: 'VPN Access' },
  { value: 'git', label: 'Git Repository' },
  { value: 'jira', label: 'Jira' },
  { value: 'confluence', label: 'Confluence' },
  { value: 'slack', label: 'Slack' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'erp', label: 'ERP System' },
  { value: 'hr_system', label: 'HR System' }
]
