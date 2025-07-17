import React from 'react';
import { Card, Typography, Row, Col, Spin } from 'antd';
import { ClockCircleOutlined, TeamOutlined, AlertOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { useEmploymentTypeDistribution } from '../../hooks/useEmploymentTypeDistribution';
import { useFteRatio } from '../../hooks/useFteRatio';
import { useGapRate } from '../../hooks/useGapRate';
import { useProbationRate } from '../../hooks/useProbationRate';
import { useAverageTenure } from '../../hooks/useAverageTenure';
import { useTenureByOrgUnit } from '../../hooks/useTenureByOrgUnit';
import TenureHeatmapChart from '../charts/TenureHeatmapChart';
import EmploymentTypePieChart from '../charts/EmploymentTypePieChart';
import ContractTypePieChart from '../charts/ContractTypePieChart';
import GapRateByOrgUnitChart from '../charts/GapRateByOrgUnitChart';
import ProbationRateByOrgUnitChart from '../charts/ProbationRateByOrgUnitChart';

const { Title, Text } = Typography;

interface WorkforceProps {
  loading?: boolean;
  accessToken?: string;
}

/**
 * Workforce tab component displaying key workforce metrics
 */
const Workforce: React.FC<WorkforceProps> = ({ accessToken = '' }) => {
  // Get the current active structure ID
  const structureId = getCurrentActiveStructureId();
  // Get employment type distribution data
  const { distribution: employmentTypeDistribution, loading: empTypeLoading, error: empTypeError } = 
    useEmploymentTypeDistribution(accessToken);
    
  // Note: Contract type distribution is now handled internally by the ContractTypePieChart component
    
  // Get FTE to Employee ratio data
  const { totalFte, employeeCount, loading: fteLoading, error: fteError } = 
    useFteRatio(accessToken);
    
  // Get Gap Rate data
  const { gapRate, vacantPositions, totalPositions, loading: gapRateLoading, error: gapRateError } = 
    useGapRate(accessToken);
    
  // Get Probation Rate data
  const { probationRate, employeesInProbation, totalEmployees, loading: probationRateLoading, error: probationRateError } = 
    useProbationRate(accessToken);
    
  // Get Average Tenure data
  const { formattedTenure, employeeCount: employeesWithTenure, loading: tenureLoading, error: tenureError } = 
    useAverageTenure(accessToken);
    
  // Get Tenure by Organizational Unit data for heatmap
  const { 
    tenureDistribution, 
    orgUnits, 
    tenureRanges, 
    loading: tenureDistributionLoading, 
    error: tenureDistributionError 
  } = useTenureByOrgUnit(accessToken, structureId);

  // Each error is handled individually in its respective component section

  const workforceMetrics = {
    fteCount: {
      value: fteLoading ? '-' : totalFte.toFixed(1),
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_total_fte', 'Total FTE')
    },
    employeeCount: {
      value: fteLoading ? '-' : employeeCount,
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_employee_count', 'Employees')
    },
    avgTenure: {
      value: tenureLoading ? '-' : formattedTenure,
      period: tenureLoading ? getTranslationFromI18nKeyAndLabel('hr_analytics_company_average', 'Company average') : 
        getTranslationFromI18nKeyAndLabel('hr_analytics_employees_with_tenure', `${employeesWithTenure} employees`)
    },
    gapRate: {
      value: gapRateLoading ? '-' : gapRate.toFixed(1) + '%',
      period: getTranslationFromI18nKeyAndLabel('hr_analytics_vacant_positions', `${vacantPositions}/${totalPositions} positions`)
    },
    probationRate: {
      value: probationRateLoading ? '-' : probationRate.toFixed(1) + '%',
      period: getTranslationFromI18nKeyAndLabel(
        'hr_analytics_employees_in_probation', 
        `${employeesInProbation}/${totalEmployees} employees`
      )
    }
  };

  return (
    <div data-testid="hr-analytics-workforce-tab">
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="hr-analytics-fte-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_fte_metrics', 'FTE / Employee Count')}
                </Text>
                <TeamOutlined className="gba:text-blue-500" />
              </div>
              {fteLoading ? (
                <div className="gba:py-4 gba:flex gba:justify-center">
                  <Spin size="small" />
                </div>
              ) : fteError ? (
                <Text className="gba:text-red-500">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
                </Text>
              ) : (
                <div className="gba:flex gba:flex-row gba:justify-around gba:items-center">
                  <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
                    <Title level={3} className="gba:m-0 gba:mb-1">
                      {workforceMetrics.fteCount.value}
                    </Title>
                    <Text className="gba:text-gray-500 gba:text-sm">
                      {workforceMetrics.fteCount.label}
                    </Text>
                  </div>
                  <div className="gba:flex gba:items-center gba:text-gray-400 gba:text-xl">
                    /
                  </div>
                  <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
                    <Title level={3} className="gba:m-0 gba:mb-1">
                      {workforceMetrics.employeeCount.value}
                    </Title>
                    <Text className="gba:text-gray-500 gba:text-sm">
                      {workforceMetrics.employeeCount.label}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="hr-analytics-avg-tenure-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_avg_tenure', 'Avg Tenure')}
                </Text>
                <ClockCircleOutlined className="gba:text-blue-500" />
              </div>
              {tenureLoading ? (
                <div className="gba:py-4 gba:flex gba:justify-center">
                  <Spin size="small" />
                </div>
              ) : tenureError ? (
                <Text className="gba:text-red-500">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
                </Text>
              ) : (
                <>
                  <Title level={2} className="gba:m-0 gba:mb-1">
                    {workforceMetrics.avgTenure.value}
                  </Title>
                  <Text className="gba:text-gray-500 gba:text-sm">
                    {workforceMetrics.avgTenure.period}
                  </Text>
                </>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="hr-analytics-gap-rate-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate', 'Gap Rate')}
                </Text>
                <AlertOutlined className="gba:text-amber-500" />
              </div>
              {gapRateLoading ? (
                <div className="gba:py-4 gba:flex gba:justify-center">
                  <Spin size="small" />
                </div>
              ) : gapRateError ? (
                <Text className="gba:text-red-500">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
                </Text>
              ) : (
                <>
                  <Title level={2} className="gba:m-0 gba:mb-1">
                    {workforceMetrics.gapRate.value}
                  </Title>
                  <Text className="gba:text-gray-500 gba:text-sm">
                    {workforceMetrics.gapRate.period}
                  </Text>
                </>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="gba:h-full" data-testid="hr-analytics-probation-rate-card">
            <div className="gba:flex gba:flex-col">
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                <Text className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_probation_rate', 'Probation Rate')}
                </Text>
                <UserSwitchOutlined className="gba:text-yellow-500" />
              </div>
              {probationRateLoading ? (
                <div className="gba:py-4 gba:flex gba:justify-center">
                  <Spin size="small" />
                </div>
              ) : probationRateError ? (
                <Text className="gba:text-red-500">
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
                </Text>
              ) : (
                <>
                  <Title level={2} className="gba:m-0 gba:mb-1">
                    {workforceMetrics.probationRate.value}
                  </Title>
                  <Text className="gba:text-gray-500 gba:text-sm">
                    {workforceMetrics.probationRate.period}
                  </Text>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} md={12}>
          <EmploymentTypePieChart 
            data={employmentTypeDistribution}
            loading={empTypeLoading}
            error={empTypeError}
          />
        </Col>
        
        <Col xs={24} md={12}>
          <ContractTypePieChart accessToken={accessToken} />
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24}>
          <TenureHeatmapChart 
            data={tenureDistribution}
            orgUnits={orgUnits}
            tenureRanges={tenureRanges}
            loading={tenureDistributionLoading}
            error={tenureDistributionError}
          />
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} md={12}>
          <GapRateByOrgUnitChart accessToken={accessToken} />
        </Col>
        <Col xs={24} md={12}>
          <ProbationRateByOrgUnitChart accessToken={accessToken} />
        </Col>
      </Row>
      
    </div>
  );
};

export default Workforce;
