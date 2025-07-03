import { formatNumberFunction } from '@/common/utils/windowUtils';

// Helper function to format numbers using the global lowcoder function
export const formatNumber = (value: number, format = '0,0.00[,]00'): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  // The global function expects a string, so we convert the number.
  return formatNumberFunction(String(value), format);
};

export const formatCurrency = (value: number): string => {
  const formattedValue = formatNumber(value);
  return `€${formattedValue} `;
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
