export interface StatusConfig {
  label: string;
  color: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  PREPARED: { label: 'Prepared', color: 'rgba(55, 99, 153, 0.55)' },
  CREATED: { label: 'Draft', color: 'rgba(55, 99, 153, 0.55)' },
  ASSIGNED: { label: 'Assigned', color: 'rgba(0, 148, 209, 0.55)' },
  PENDING: { label: 'In Approval', color: 'rgba(0, 148, 209, 0.55)' },
  APPROVED: { label: 'Verification Required', color: 'rgba(255, 158, 2, 0.55)' },
  VERIFIED: { label: 'Booking Required', color: 'rgba(255, 158, 2, 0.55)' },
  BOOKED: { label: 'Transfer Required', color: 'rgba(255, 158, 2, 0.55)' },
  TRANSFERRED: { label: 'Payment Required', color: 'rgba(255, 158, 2, 0.55)' },
  PAID: { label: 'Paid', color: 'rgba(13, 188, 123, 0.55)' },
  REJECTED: { label: 'Revision Required', color: 'rgba(0, 148, 209, 1)' },
  CLOSED: { label: 'Closed', color: 'rgba(13, 188, 123, 0.55)' }
};

export const getStatusConfig = (status: string): StatusConfig => {
  return statusConfigs[status] || { label: status || 'Unknown', color: 'rgba(141, 145, 153, 0.55)' };
};

// Export all status options for filter dropdowns
export const statusOptions = Object.entries(statusConfigs).map(([value, config]) => ({
  value,
  label: config.label,
  color: config.color
}));
