import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Resolves the user's first name from the available user info.
 * Tries multiple fallback strategies to ensure we always have a name.
 *
 * @param userInfo - The user info from BusinessAppContextProps
 * @returns The user's first name, or undefined if not available
 */
export function resolveUserFirstName(userInfo?: BusinessAppContextProps['userInfo']): string | undefined {
  // Try employee details first (most reliable)
  if (userInfo?.employeeDetails?.firstName) {
    return userInfo.employeeDetails.firstName
  }

  // Fall back to givenName from user profile
  if (userInfo?.givenName) {
    return userInfo.givenName
  }

  // Last resort: use nickname or first part of username
  if (userInfo?.nickName) {
    return userInfo.nickName
  }

  if (userInfo?.userName) {
    // Extract first part before @ if email
    const firstPart = userInfo.userName.split('@')[0]
    // Capitalize first letter
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1)
  }

  return undefined
}

/**
 * Resolves the user's full name from the available user info.
 * Tries multiple fallback strategies to ensure we always have a name.
 *
 * @param userInfo - The user info from BusinessAppContextProps
 * @returns The user's full name, or undefined if not available
 */
export function resolveUserFullName(userInfo?: BusinessAppContextProps['userInfo']): string | undefined {
  // Try employee details first (most reliable)
  if (userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName) {
    return `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
  }

  // Fall back to given + family name
  if (userInfo?.givenName && userInfo?.familyName) {
    return `${userInfo.givenName} ${userInfo.familyName}`
  }

  // Use first name only if available
  const firstName = resolveUserFirstName(userInfo)
  if (firstName) {
    return firstName
  }

  return userInfo?.userName
}
