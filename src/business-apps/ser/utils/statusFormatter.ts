/**
 * Status configuration with labels for display formatting
 */
const STATUS_CONFIG = {
  // Core statuses
  SCHEDULED: { label: 'Scheduled' },
  OPEN: { label: 'Open' },
  IN_PROGRESS: { label: 'In Progress' },
  COMPLETED: { label: 'Completed' },
  REJECTED: { label: 'Rejected' },
  FAILED: { label: 'Failed' },
  PAUSED: { label: 'Paused' },
  // Workflow engine specific statuses
  READY: { label: 'Ready' },
  QUEUED: { label: 'Queued' },
  RUNNING: { label: 'Running' },
  DONE: { label: 'Done' },
  ERROR: { label: 'Error' },
  CANCELLED: { label: 'Cancelled' },
  CANCELED: { label: 'Canceled' },
  SKIPPED: { label: 'Skipped' },
  TIMED_OUT: { label: 'Timed Out' },
  UNKNOWN: { label: 'Unknown' }
} as const;

/**
 * Format status text for display (converts IN_PROGRESS to "In Progress", etc.)
 * 
 * @param status - Raw status string from API
 * @returns Formatted status text for display
 * 
 * @example
 * formatStatusText('IN_PROGRESS') // Returns "In Progress"
 * formatStatusText('COMPLETED') // Returns "Completed"
 * formatStatusText('CUSTOM_STATUS') // Returns "Custom Status"
 */
export const formatStatusText = (status: string): string => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  return config?.label || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

