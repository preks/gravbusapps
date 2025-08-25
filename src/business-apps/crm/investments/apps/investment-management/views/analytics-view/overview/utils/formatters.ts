import React from 'react';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

export const formatCurrency = (amount: number | undefined | null, currencyCode: string = 'EUR'): string => {
  const locale = getCurrentActiveUserLocale();
  if (amount === undefined || amount === null || isNaN(amount)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(0);
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toFixed(0);
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  return `${value.toFixed(2)}%`;
};

export const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return React.createElement('text', {
    x: x,
    y: y,
    fill: 'white',
    textAnchor: x > cx ? 'start' : 'end',
    dominantBaseline: 'central',
    fontSize: '12',
    fontWeight: 'bold'
  }, `${(percent * 100).toFixed(1)}%`);
};

export const renderLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return React.createElement('div', {
      className: 'custom-tooltip',
      style: {
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px'
      }
    }, [
      React.createElement('p', { key: 'date' }, `Date: ${label}`),
      ...payload.map((item: any, index: number) => 
        React.createElement('p', { 
          key: `value-${index}`,
          style: { color: item.color }
        }, `${item.dataKey}: ${formatCurrency(item.value)}`)
      )
    ]);
  }
  return null;
};

export const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87d068', '#ffa39e', '#b7eb8f'
];


