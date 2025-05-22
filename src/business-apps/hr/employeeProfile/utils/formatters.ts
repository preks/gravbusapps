import { Employee } from '../hooks/useEmployeeData';

/**
 * Format a phone number for display
 * @param phoneNumber The raw phone number string
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Basic formatting - in a real implementation, this would handle
  // different country formats, extensions, etc.
  if (!phoneNumber) return '';
  
  // Remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  } else if (cleaned.length > 10) {
    return `+${cleaned.substring(0, cleaned.length - 10)} (${cleaned.substring(cleaned.length - 10, cleaned.length - 7)}) ${cleaned.substring(cleaned.length - 7, cleaned.length - 4)}-${cleaned.substring(cleaned.length - 4)}`;
  }
  
  // If we can't format it, return the original
  return phoneNumber;
};

/**
 * Get the full name of an employee
 * @param employee The employee object
 * @returns Formatted full name
 */
export const getEmployeeFullName = (employee: Employee): string => {
  if (!employee) return '';
  
  const parts = [];
  
  // Removed salutation as requested
  
  if (employee.academicTitleRef) {
    parts.push(employee.academicTitleRef);
  }
  
  if (employee.firstName) {
    parts.push(employee.firstName);
  }
  
  if (employee.lastName) {
    parts.push(employee.lastName);
  }
  
  return parts.join(' ');
};

/**
 * Format file size for display
 * @param bytes Size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Calculate time since a given date
 * @param date The date to calculate from
 * @returns Formatted time since string
 */
export const getTimeSince = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  
  const diffYears = now.getFullYear() - then.getFullYear();
  const diffMonths = now.getMonth() - then.getMonth();
  
  if (diffYears > 0) {
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'}`;
  } else if (diffMonths > 0) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`;
  } else {
    return 'Less than a month';
  }
};

/**
 * Get the appropriate status color class for a status
 * @param status The status string
 * @returns CSS class for the status
 */
export const getStatusColorClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'APPROVED': 'bg-green-100 text-green-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'REJECTED': 'bg-red-100 text-red-800',
    'COMPLETED': 'bg-blue-100 text-blue-800',
    'IN_PROGRESS': 'bg-purple-100 text-purple-800',
    'ON_TRACK': 'bg-green-100 text-green-800',
    'BEHIND_TARGET': 'bg-yellow-100 text-yellow-800',
    'AT_RISK': 'bg-red-100 text-red-800',
    'ACHIEVED': 'bg-blue-100 text-blue-800',
    'NOT_ACHIEVED': 'bg-gray-100 text-gray-800'
  };
  
  return statusMap[status] || 'bg-gray-100 text-gray-800';
};
