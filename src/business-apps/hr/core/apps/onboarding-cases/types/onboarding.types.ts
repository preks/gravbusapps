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
 * Onboarding stage progression
 */
export type OnboardingStage = 'pre_arrival' | 'first_day' | 'first_week' | 'first_month' | 'completed'

/**
 * Work location options
 */
export type WorkLocation = 'office' | 'remote' | 'hybrid'

/**
 * Extended metadata for onboarding cases
 */
export interface OnboardingMetadata extends CaseMetadata {
  // Employee information
  employeeName: string
  position: string
  department: string
  managerId?: string

  // Onboarding details
  startDate: string
  onboardingStage: OnboardingStage
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
  onCaseCreated: (caseId: string, metadata?: OnboardingMetadata) => void
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
 * Onboarding stage display labels
 */
export const onboardingStageLabels: Record<OnboardingStage, string> = {
  pre_arrival: 'Pre-Arrival',
  first_day: 'First Day',
  first_week: 'First Week',
  first_month: 'First Month',
  completed: 'Completed'
}

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

/**
 * Get stage progress percentage
 */
export const getStageProgress = (stage: OnboardingStage): number => {
  const stageValues: Record<OnboardingStage, number> = {
    pre_arrival: 10,
    first_day: 30,
    first_week: 50,
    first_month: 80,
    completed: 100
  }
  return stageValues[stage]
}

/**
 * Get next stage in progression
 */
export const getNextStage = (current: OnboardingStage): OnboardingStage | null => {
  const progression: OnboardingStage[] = ['pre_arrival', 'first_day', 'first_week', 'first_month', 'completed']
  const currentIndex = progression.indexOf(current)
  if (currentIndex === -1 || currentIndex === progression.length - 1) return null
  return progression[currentIndex + 1]
}
