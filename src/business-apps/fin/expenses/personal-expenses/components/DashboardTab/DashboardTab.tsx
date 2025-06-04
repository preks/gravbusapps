import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Space } from 'antd';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseDashboard } from '../../hooks/useGetExpenseDashboard';
import {
  SummaryStatistics,
  SpendingOverview,
  ActionFeed,
  QuickActionCards
} from './components';

const { Title } = Typography;

export interface DashboardTabProps extends BusinessAppContextProps {}

const DashboardTab: React.FC<DashboardTabProps> = (props) => {
  const { stats, isLoading, error } = useGetExpenseDashboard(props);
  const [chartView, setChartView] = useState<string | number>('Monthly');

  const renderDataBody = () => {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: '16px' }}>Quick Actions</Title>
          <QuickActionCards />
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '16px' }}>Summary Statistics</Title>
          <SummaryStatistics stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '16px' }}>Spending Overview</Title>
          <SpendingOverview
            stats={stats ?? undefined}
            isLoading={isLoading}
            error={error ? new Error(error) : null}
            chartView={chartView}
            setChartView={setChartView}
          />
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '16px' }}>Action Feed</Title>
          <ActionFeed stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
        </div>
      </Space>
    );
  };

  return (
    <DataContainer
      dataControllerProps={{
        search: '',
        filter: [],
        setSearch: () => {},
        setFilter: () => {},
      }}
      dataFilterProps={{}}
      hideFilter={true}
      dataBody={renderDataBody()}
      contentBackground="white"
    />
  );
};

export default DashboardTab;
