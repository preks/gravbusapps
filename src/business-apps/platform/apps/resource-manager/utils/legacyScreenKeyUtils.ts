/**
 * Legacy screen key parsing utilities
 *
 * These utilities handle the old format: frm_<processName><CapitalizedTaskName>
 * where process name and task name are concatenated without a separator.
 *
 * Example: frm_completeCustomerTaskCompleteTask
 * - Process: completeCustomerTask
 * - Task: CompleteTask -> completeTask
 */

/**
 * Capitalize first letter of a string
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Decapitalize first letter of a string
 */
export const decapitalizeFirstLetter = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Parse legacy format screen key by trying to split from right to left
 *
 * Strategy: Start with the full string as process name and empty task.
 * Then progressively move characters from process to task (from right to left)
 * until we find a process that exists in the domains list.
 *
 * @param keyPart - The part after "frm_" prefix
 * @param domains - List of available domains with their processes
 * @returns Parsed data or null if no match found
 */
export const parseLegacyScreenKey = (
  keyPart: string,
  domains: Array<{ id: string; name: string; processes: Array<{ id?: string; name: string }> }>
): { process: string; userTaskName: string; domain: string; isLaunchingForm: boolean } | null => {
  // Helper to find domain by process name
  const findDomainByProcess = (processName: string) => {
    return domains.find(d => d.processes.some(p => p.name === processName))
  }

  // First check: Try exact match (launching form - no task name)
  const exactDomain = findDomainByProcess(keyPart)
  if (exactDomain) {
    return {
      process: keyPart,
      userTaskName: '',
      domain: exactDomain.id,
      isLaunchingForm: true
    }
  }

  // Legacy format with task: Parse from right to left
  // Try progressively shorter process names (moving characters to task name)
  for (let i = keyPart.length - 1; i > 0; i--) {
    const potentialProcess = keyPart.substring(0, i)
    const potentialTask = keyPart.substring(i)

    // Check if this process exists in our domains
    const domain = findDomainByProcess(potentialProcess)

    if (domain && potentialTask) {
      // Found a match!
      // Convert the capitalized task name back to camelCase
      return {
        process: potentialProcess,
        userTaskName: decapitalizeFirstLetter(potentialTask),
        domain: domain.id,
        isLaunchingForm: false
      }
    }
  }

  // No match found - return the whole keyPart as process (edge case)
  return {
    process: keyPart,
    userTaskName: '',
    domain: '',
    isLaunchingForm: true
  }
}
