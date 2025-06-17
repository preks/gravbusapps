// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Helper function to calculate percentage change
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get status colors
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': '#8c8c8c',
    'SUBMITTED': '#1890ff',
    'APPROVED': '#52c41a',
    'REJECTED': '#f5222d',
    'PAID': '#722ed1',
    'CANCELLED': '#fa8c16'
  };
  return statusMap[status] || '#8c8c8c';
};
