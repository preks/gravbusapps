export interface ProcessStartInfo {
  domain: string;
  processName: string;
  payload?: { [key: string]: any };
  processInstanceId?: string;
}

export function getCurrentActiveStructureId() {
  if (window?.lowcoder?.activeStructureId) {
    return window.lowcoder.activeStructureId;
  }
  return "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf";
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
  if (window.lowcoder?.platformContext) {
    return window.lowcoder.platformContext;
  }
  return { structureId: getCurrentActiveStructureId() ?? "" };
}

export function startProcess({
  domain,
  processName,
  payload,
  processInstanceId,
}: ProcessStartInfo) {
  window.dispatchEvent(
    new CustomEvent("com.newwork.process.start", {
      detail: {
        domain,
        processName,
        startProcessBody: { ...getPlatformContext(), ...payload },
        processInstanceId,
      },
    })
  );
}
