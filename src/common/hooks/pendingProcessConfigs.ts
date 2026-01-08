import type { PendingProcessCheckConfig } from './usePendingProcessCheck.types'

/**
 * Predefined process configurations for common employee self-service processes
 * These are convenience constants - consumers can create their own configs
 *
 * NEW BACKEND: No need for entityField - backend now has status field!
 */
export const EMPLOYEE_PROCESS_CONFIGS = {
  CHANGE_BANK_ACCOUNT: {
    processPath: 'changeBankAccount'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>,
  CHANGE_ADDRESS: {
    processPath: 'changeAddress'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>,
  CHANGE_PERSONAL_DATA: {
    processPath: 'changePersonalData'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>,
  CHANGE_COMMUNICATION: {
    processPath: 'changeCommunication'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>,
  GRANT_BONUS: {
    processPath: 'grantBonus'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>,
  ADJUST_SALARY: {
    processPath: 'adjustSalary'
  } satisfies Pick<PendingProcessCheckConfig, 'processPath'>
} as const
