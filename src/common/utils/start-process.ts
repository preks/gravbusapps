import {
  getCurrentActiveStructureId as WindowUtilsGetCurrentActiveStructureId,
  getPlatformContext as WindowUtilsGetPlatformContext
} from './windowUtils'
export interface ProcessStartInfo {
  domain: string
  processName: string
  payload?: { [key: string]: any }
  processInstanceId?: string
  builderType?: 'NATIVE_SCREEN'
  skipScreen?: boolean
  targetDesktop?: string
  targetMobile?: string
}

export function getCurrentActiveStructureId() {
  return WindowUtilsGetCurrentActiveStructureId()
}

/**
 * Returns the context object cotaining several
 * IDs of the logged-in user like: employeeId,
 * structureId, organizationalUnitId, managerId.
 *
 * @returns {Object} context - The context object.
 * @returns {uuid} context.employeeId - The logged-in employeeId.
 * @returns {uuid} context.structureId - The structureId of the employee.
 * @returns {uuid} context.organizationalUnitId - The organizationalUnitId of the employee.
 * @returns {uuid} context.managerId - The employeeId of the manager.
 * @returns {uuid} context.locationId - The locationId of the manager.
 */
export function getPlatformContext() {
  return WindowUtilsGetPlatformContext()
}

export function startProcess({
  domain,
  processName,
  payload,
  processInstanceId,
  builderType = 'NATIVE_SCREEN',
  skipScreen = false,
  targetDesktop,
  targetMobile
}: ProcessStartInfo) {
  const startProcessBody = { ...getPlatformContext(), ...payload }

  // Include targetDesktop and targetMobile in startProcessBody for platform compatibility
  if (targetDesktop) {
    startProcessBody.targetDesktop = targetDesktop
  }
  if (targetMobile) {
    startProcessBody.targetMobile = targetMobile
  }

  window.dispatchEvent(
    new CustomEvent('com.newwork.process.start', {
      detail: {
        domain,
        processName,
        startProcessBody,
        processInstanceId,
        builderType,
        skipScreen
      }
    })
  )
}
