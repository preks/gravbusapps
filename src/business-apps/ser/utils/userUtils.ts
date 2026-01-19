import type { UserInfoProps } from '@/common/BusinessAppContext';

/**
 * Get a user's display name from their UserInfo object
 * Tries multiple name sources in order of preference:
 * 1. Employee firstName + lastName
 * 2. Given name + family name
 * 3. Nickname
 * 4. Username
 * 5. Employee ID
 * 6. Fallback to provided default
 */
export const getUserDisplayName = (
  userInfo?: UserInfoProps, 
  fallback: string = 'Unknown User'
): string => {
  if (!userInfo) return fallback;
  
  // Try employee details first (most reliable for business context)
  const empFirstName = userInfo.employeeDetails?.firstName;
  const empLastName = userInfo.employeeDetails?.lastName;
  
  if (empFirstName && empLastName) {
    return `${empFirstName} ${empLastName}`;
  }
  
  // Try user profile names
  const givenName = userInfo.givenName;
  const familyName = userInfo.familyName;
  
  if (givenName && familyName) {
    return `${givenName} ${familyName}`;
  }
  
  // Single name fallbacks
  if (empFirstName) return empFirstName;
  if (givenName) return givenName;
  if (userInfo.nickName) return userInfo.nickName;
  if (userInfo.userName) return userInfo.userName;
  if (userInfo.employeeDetails?.employeeId) return userInfo.employeeDetails.employeeId;
  if (userInfo.id) return userInfo.id;
  
  return fallback;
};

/**
 * Get a user's formal display name (suitable for official contexts)
 * Always tries to use full first + last name format
 */
export const getUserFormalName = (
  userInfo?: UserInfoProps, 
  fallback: string = 'Unknown User'
): string => {
  if (!userInfo) return fallback;
  
  const firstName = userInfo.employeeDetails?.firstName || userInfo.givenName;
  const lastName = userInfo.employeeDetails?.lastName || userInfo.familyName;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  // If we can't get full name, fall back to display name logic
  return getUserDisplayName(userInfo, fallback);
};

/**
 * Get a user's casual display name (suitable for informal contexts)
 * Prefers nickname or first name over full formal name
 */
export const getUserCasualName = (
  userInfo?: UserInfoProps, 
  fallback: string = 'Unknown User'
): string => {
  if (!userInfo) return fallback;
  
  // Prefer casual names
  if (userInfo.nickName) return userInfo.nickName;
  if (userInfo.employeeDetails?.firstName) return userInfo.employeeDetails.firstName;
  if (userInfo.givenName) return userInfo.givenName;
  
  // Fall back to full display name
  return getUserDisplayName(userInfo, fallback);
};

/**
 * Get user initials for avatar displays
 */
export const getUserInitials = (
  userInfo?: UserInfoProps, 
  fallback: string = 'U'
): string => {
  if (!userInfo) return fallback;
  
  const firstName = userInfo.employeeDetails?.firstName || userInfo.givenName;
  const lastName = userInfo.employeeDetails?.lastName || userInfo.familyName;
  
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }
  
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  if (userInfo.nickName) {
    return userInfo.nickName.charAt(0).toUpperCase();
  }
  
  if (userInfo.userName) {
    return userInfo.userName.charAt(0).toUpperCase();
  }
  
  return fallback;
};

/**
 * Get user's employee ID from their UserInfo object
 * Returns the employeeId if available, null otherwise
 */
export const getUserEmployeeId = (userInfo?: UserInfoProps): string | null => {
  if (!userInfo) return null;
  
  return userInfo.employeeDetails?.employeeId || null;
};