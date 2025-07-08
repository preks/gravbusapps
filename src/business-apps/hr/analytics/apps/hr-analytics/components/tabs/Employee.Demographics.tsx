import React from 'react';
import { Card, Spin, Alert, Row, Col, Typography } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarOutlined, TeamOutlined, GlobalOutlined, UserOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeeDemographicData } from '../../hooks/useEmployeeDemographicData';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Chart color palette
const CHART_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const { Title, Text } = Typography;

// Render name with count label for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percent is greater than 3%
  return percent > 0.03 ? (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

/**
 * Employee Demographics component that displays statistics and pie charts for gender, nationality, and age distributions
 */
interface EmployeeDemographicsProps extends BusinessAppContextProps {
  loading?: boolean;
}

const EmployeeDemographics: React.FC<EmployeeDemographicsProps> = ({ accessToken, loading: parentLoading }) => {
  const { loading: dataLoading, error, demographicData } = useEmployeeDemographicData({ accessToken });
  
  // Use either parent loading state or internal loading state
  const loading = parentLoading || dataLoading;
  
  // Demographics metrics for header cards
  const demographicsMetrics = {
    averageAge: {
      value: demographicData?.averageAge !== null ? `${demographicData?.averageAge}` : '-',
      label: getTranslationFromI18nKeyAndLabel('employee.average_age', 'Average Age'),
      suffix: demographicData?.averageAge !== null ? ' years' : '',
      icon: <CalendarOutlined className="gba:text-blue-500" />
    },
    averageTenure: {
      value: demographicData?.averageTenure !== null ? `${demographicData?.averageTenure}` : '-',
      label: getTranslationFromI18nKeyAndLabel('employee.average_tenure', 'Average Tenure'),
      suffix: demographicData?.averageTenure !== null ? ' years' : '',
      icon: <TeamOutlined className="gba:text-blue-500" />
    },
    mostCommonGender: {
      value: demographicData?.mostCommonGender || '-',
      label: getTranslationFromI18nKeyAndLabel('employee.most_common_gender', 'Most Common Gender'),
      suffix: '',
      icon: <UserOutlined className="gba:text-blue-500" />
    },
    mostCommonNationality: {
      value: demographicData?.mostCommonNationality || '-',
      label: getTranslationFromI18nKeyAndLabel('employee.most_common_nationality', 'Most Common Nationality'),
      suffix: '',
      icon: <GlobalOutlined className="gba:text-blue-500" />
    }
  };
  
  const renderPieChart = (data: any[], dataKey: string, nameKey: string = 'name') => {
    if (!data || data.length === 0) {
      return (
        <Alert 
          message={getTranslationFromI18nKeyAndLabel('common.no_data', 'No Data')} 
          description={getTranslationFromI18nKeyAndLabel('common.no_data_description', 'There is no data available to display.')}
          type="info"
          showIcon
          data-testid="employee-demographics-no-data"
        />
      );
    }
    
    // Sort data by count in descending order to make the chart more readable
    const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]);
    
    return (
      <div className="gba:pie-chart gba:flex gba:flex-col gba:h-full">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart data-testid={`employee-demographics-${dataKey}-chart`}>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {sortedData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} employees`, nameKey === 'ageRange' ? 'Age Range' : (nameKey === 'tenureRange' ? 'Tenure' : nameKey)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="gba:mt-2 gba:flex gba:flex-wrap gba:justify-center gba:gap-2">
          {sortedData.map((entry, index) => {
            const itemKey = entry[nameKey];
            const itemValue = entry[dataKey];
            const percent = Math.round((itemValue / sortedData.reduce((sum, item) => sum + item[dataKey], 0)) * 100);
            return (
              <div key={`legend-${index}`} className="gba:flex gba:items-center gba:mr-4">
                <div 
                  className="gba:w-3 gba:h-3 gba:mr-1" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="gba:text-xs">
                  {itemKey}: {itemValue} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-80" data-testid="employee-demographics-container">
        <Spin size="large" data-testid="employee-demographics-loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="employee-demographics-container">
        <Alert 
          message={getTranslationFromI18nKeyAndLabel('common.error', 'Error')}
          description={error.message}
          type="error"
          showIcon
          data-testid="employee-demographics-error"
        />
      </div>
    );
  }

  return (
    <div className="gba:employee-demographics-container" data-testid="hr-analytics-demographics-tab">
      {/* KPI Header Cards */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="common-gender-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {demographicsMetrics.mostCommonGender.label}
                </Text>
                {demographicsMetrics.mostCommonGender.icon}
              </div>
              <div className="gba:flex gba:flex-col">
                <Title level={3} className="gba:m-0">
                  {demographicsMetrics.mostCommonGender.value}
                </Title>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="common-nationality-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {demographicsMetrics.mostCommonNationality.label}
                </Text>
                {demographicsMetrics.mostCommonNationality.icon}
              </div>
              <div className="gba:flex gba:flex-col">
                <Title level={3} className="gba:m-0">
                  {demographicsMetrics.mostCommonNationality.value}
                </Title>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="average-age-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {demographicsMetrics.averageAge.label}
                </Text>
                {demographicsMetrics.averageAge.icon}
              </div>
              <div className="gba:flex gba:flex-col">
                <Title level={3} className="gba:m-0">
                  {demographicsMetrics.averageAge.value}
                  <span className="gba:text-gray-500 gba:text-lg">{demographicsMetrics.averageAge.suffix}</span>
                </Title>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="average-tenure-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {demographicsMetrics.averageTenure.label}
                </Text>
                {demographicsMetrics.averageTenure.icon}
              </div>
              <div className="gba:flex gba:flex-col">
                <Title level={3} className="gba:m-0">
                  {demographicsMetrics.averageTenure.value}
                  <span className="gba:text-gray-500 gba:text-lg">{demographicsMetrics.averageTenure.suffix}</span>
                </Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Charts */}
      <Row gutter={[24, 24]} className="gba:chart-row">
        <Col xs={24} md={12} lg={6}>
          <Card 
            title={getTranslationFromI18nKeyAndLabel('employee.gender_distribution', 'Gender Distribution')} 
            className="gba:chart-card" 
            data-testid="gender-chart-card"
            bodyStyle={{ height: '300px' }}
            headStyle={{ textAlign: 'center' }}
          >
            {renderPieChart(demographicData.genderDistribution, 'count', 'gender')}
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card 
            title={getTranslationFromI18nKeyAndLabel('employee.nationality_distribution', 'Nationality Distribution')} 
            className="gba:chart-card" 
            data-testid="nationality-chart-card"
            bodyStyle={{ height: '300px' }}
            headStyle={{ textAlign: 'center' }}
          >
            {renderPieChart(demographicData.nationalityDistribution, 'count', 'nationality')}
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card 
            title={getTranslationFromI18nKeyAndLabel('employee.age_distribution', 'Age Distribution')} 
            className="gba:chart-card" 
            data-testid="age-chart-card"
            bodyStyle={{ height: '300px' }}
            headStyle={{ textAlign: 'center' }}
          >
            {renderPieChart(demographicData.ageDistribution, 'count', 'ageRange')}
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card 
            title={getTranslationFromI18nKeyAndLabel('employee.tenure_distribution', 'Tenure Distribution')} 
            className="gba:chart-card" 
            data-testid="tenure-chart-card"
            bodyStyle={{ height: '300px' }}
            headStyle={{ textAlign: 'center' }}
          >
            {renderPieChart(demographicData.tenureDistribution, 'count', 'tenureRange')}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export { EmployeeDemographics };
export default EmployeeDemographics;
