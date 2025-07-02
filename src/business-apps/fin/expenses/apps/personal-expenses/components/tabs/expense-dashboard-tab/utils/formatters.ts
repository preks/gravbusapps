import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

// Helper function to format currency
export const formatCurrency = (amount: number, currency = 'EUR'): string => {
  const locale = getCurrentActiveUserLocale();
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
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
