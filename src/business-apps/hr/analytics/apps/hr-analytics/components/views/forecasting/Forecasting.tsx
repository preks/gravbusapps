import React, { useState } from 'react';
import { Typography, Tabs } from 'antd';
import { DollarOutlined, TeamOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SalaryForecasting, WorkforceForecasting } from './components/tabs';

const { Title, Text } = Typography;

interface ForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const Forecasting: React.FC<ForecastingProps> = (props) => {
  const { prefixDataTestId = 'Forecasting' } = props;
  const [activeTab, setActiveTab] = useState<string>('salary');

  const tabItems = [
    {
      key: 'salary',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <DollarOutlined />
          {getTranslationFromI18nKeyAndLabel('hr_analytics_salary_forecasting', 'Salary Forecasting')}
        </div>
      ),
      children: <SalaryForecasting {...props} prefixDataTestId="SalaryForecasting" />
    },
    {
      key: 'workforce',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <TeamOutlined />
          {getTranslationFromI18nKeyAndLabel('hr_analytics_workforce_forecasting', 'Workforce Forecasting')}
        </div>
      ),
      children: <WorkforceForecasting {...props} prefixDataTestId="WorkforceForecasting" />
    }
  ];

  return (
    <div 
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6"
      style={{
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={3} className="gba:m-0 gba:text-gray-800">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_forecasting_analysis', 'Forecasting Analysis')}
          </Title>
          <Text className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_forecasting_description', 'Predictive workforce analytics, salary trends, and headcount projections')}
          </Text>
        </div>
      </div>

      {/* Tabs Content */}
      <div data-testid="forecasting-tabs-container" className="gba:flex-1">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="gba:h-full"
          data-testid="forecasting-tabs"
        />
      </div>
    </div>
  );
};

export default Forecasting; 