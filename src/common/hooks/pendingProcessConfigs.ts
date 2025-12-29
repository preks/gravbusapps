import type { PendingProcessCheckConfig } from './usePendingProcessCheck.types'

/**
 * Predefined process configurations for common employee self-service processes
 * These are convenience constants - consumers can create their own configs
 */
export const EMPLOYEE_PROCESS_CONFIGS = {
  CHANGE_BANK_ACCOUNT: {
    processPath: 'changeBankAccount',
    entityField: 'bankAccount'
  } satisfies Pick<PendingProcessCheckConfig<'bankAccount'>, 'processPath' | 'entityField'>,
  CHANGE_ADDRESS: {
    processPath: 'changeAddress',
    entityField: 'address'
  } satisfies Pick<PendingProcessCheckConfig<'address'>, 'processPath' | 'entityField'>,
  CHANGE_PERSONAL_DATA: {
    processPath: 'changePersonalData',
    entityField: 'personalData'
  } satisfies Pick<PendingProcessCheckConfig<'personalData'>, 'processPath' | 'entityField'>,
  CHANGE_COMMUNICATION: {
    processPath: 'changeCommunication',
    entityField: 'communication'
  } satisfies Pick<PendingProcessCheckConfig<'communication'>, 'processPath' | 'entityField'>,
  GRANT_BONUS: {
    processPath: 'grantBonus',
    entityField: 'bonus'
  } satisfies Pick<PendingProcessCheckConfig<'bonus'>, 'processPath' | 'entityField'>,
  ADJUST_SALARY: {
    processPath: 'adjustSalary',
    entityField: 'salary'
  } satisfies Pick<PendingProcessCheckConfig<'salary'>, 'processPath' | 'entityField'>
} as const
