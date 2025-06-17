import React, { useMemo } from 'react';
import { FileTextOutlined, DollarOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';
import { AdvancePayment } from '../../hooks/useGetAdvancePayments';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface AdvancePaymentStatisticsProps {
  payments: AdvancePayment[] | undefined;
  statsLoading?: boolean;
  statsError?: string | null;
  fetchAdvancePaymentStatistics?: () => Promise<void>;
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({ 
  payments,
  statsLoading = false,
  statsError = null,
  fetchAdvancePaymentStatistics = () => Promise.resolve()
}) => {
  // Calculate summary statistics
  const totalPayments = useMemo(() => payments?.length ?? 0, [payments]);
  
  const totalAmount = useMemo(() => 
    payments?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ?? 0, 
  [payments]);
  
  const pendingPayments = useMemo(() => 
    payments?.filter(item => 
      item.status.toLowerCase() === 'pending' || 
      item.status.toLowerCase() === 'submitted'
    ).length ?? 0, 
  [payments]);
  
  const approvedPayments = useMemo(() => 
    payments?.filter(item => 
      item.status.toLowerCase() === 'approved' || 
      item.status.toLowerCase() === 'paid'
    ).length ?? 0, 
  [payments]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-payments',
      title: 'Total Advance Payments',
      value: totalPayments,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'All advance payments'
    },
    {
      key: 'total-amount',
      title: 'Total Amount',
      value: totalAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Across all payments'
    },
    {
      key: 'pending-payments',
      title: 'Pending Payments',
      value: pendingPayments,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Awaiting approval'
    },
    {
      key: 'approved-payments',
      title: 'Approved Payments',
      value: approvedPayments,
      prefix: <BankOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Ready for processing'
    }
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={4}
      emptyText="No advance payment statistics available."
      data-testid="advance-payment-statistics"
    />
  );
};

export default AdvancePaymentStatistics;