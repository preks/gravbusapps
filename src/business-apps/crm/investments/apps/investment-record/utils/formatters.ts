export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

export const formatCurrency = (amount: number, currencyRef: string): string => {
  const currency = extractCurrencyCode(currencyRef);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active': return 'gba:bg-green-100 gba:text-green-800';
    case 'monitoring': return 'gba:bg-blue-100 gba:text-blue-800';
    case 'medium': return 'gba:bg-orange-100 gba:text-orange-800';
    default: return 'gba:bg-gray-100 gba:text-gray-800';
  }
}; 