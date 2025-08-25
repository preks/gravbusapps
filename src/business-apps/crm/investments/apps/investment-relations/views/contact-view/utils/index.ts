// Utility functions for the Investment Relations Contact View

/**
 * Format date string to localized format
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
};
