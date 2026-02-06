import React, { useMemo } from 'react'
import { Typography, Row, Col } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SectionKpiCards, KpiCardData, Icon } from '@newwork/nw-design-system'
import { CalendarIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useTotalPayroll } from '../../../hooks/useTotalPayroll'
import { useSalaryByOrgUnit } from '../../../hooks/useSalaryByOrgUnit'
import YearlyPayrollChart from './components/charts/YearlyPayrollChart'
import SalaryByOrgUnitChart from './components/charts/SalaryByOrgUnitChart'
import HealthInsurerDistributionChart from './components/charts/HealthInsurerDistributionChart'
import HealthInsuranceTypeDistributionChart from './components/charts/HealthInsuranceTypeDistributionChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Compensation: React.FC<CompensationProps> = ({ accessToken, prefixDataTestId = 'Compensation' }) => {
  const { t } = useTranslation(hrTranslations)
  // Use combined hook for compensation metrics (median, average salary, and merit increase)
  const {
    medianSalary,
    averageSalary,
    averageMeritIncrease,
    loading: salaryLoading,
    error: salaryError
  } = useCompensationMetrics(accessToken)
  const { loading: payrollLoading, error: payrollError } = useTotalPayroll(accessToken)
  const {
    salaryByOrgUnit,
    loading: salaryByOrgUnitLoading,
    error: salaryByOrgUnitError
  } = useSalaryByOrgUnit(accessToken)

  // Combine loading states
  const loading = payrollLoading || salaryLoading || salaryByOrgUnitLoading

  // Combine errors (show first one that occurs)
  const error = payrollError || salaryError || salaryByOrgUnitError

  // Format merit increases
  const meritIncreases = useMemo(
    () => ({
      value: averageMeritIncrease,
      label: 'Average increase'
    }),
    [averageMeritIncrease]
  )

  // Format average salary in thousands
  const formattedAverageSalary = useMemo(() => {
    return {
      value: Math.round(averageSalary / 1000), // Convert to thousands and round
      label: 'Annual average'
    }
  }, [averageSalary])

  // Format median salary in thousands
  const formattedMedianSalary = useMemo(() => {
    return {
      value: Math.round(medianSalary / 1000), // Convert to thousands and round
      label: 'Company median'
    }
  }, [medianSalary])

  // Create KPI cards data
  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'total-payroll',
        title: t('hr-analytics-total-payroll'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-1)',
        footer: t('hr-analytics-annual-payroll')
      },
      {
        id: 'median-salary',
        title: t('hr-analytics-median-salary'),
        value: loading ? t('hr-data-filter-loading') : `${formattedMedianSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-2)',
        footer: t('hr-analytics-company-median')
      },
      {
        id: 'avg-salary',
        title: t('hr-analytics-avg-salary'),
        value: loading ? t('hr-data-filter-loading') : `${formattedAverageSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-annual-average')
      },
      {
        id: 'merit-increases',
        title: t('hr-analytics-merit-increases'),
        value: loading ? t('hr-data-filter-loading') : `${meritIncreases.value}%`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-4)',
        footer: t('hr-analytics-average-increase')
      }
    ],
    [loading, formattedMedianSalary, formattedAverageSalary, meritIncreases, t]
  )

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-Error`} className="gba:p-6">
        <div className="gba:bg-destructive-secondary gba:border gba:border-destructive-secondary gba:rounded-lg gba:p-4">
          <h3 className="gba:text-destructive-secondary-foreground gba:font-medium">Error Loading Compensation Data</h3>
          <p className="gba:text-destructive-secondary-foreground gba:mt-2">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6 gba:bg-muted gba:min-h-full gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={3} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-compensation-analysis')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-compensation-description')}</Text>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={kpiCards} />
      </div>

      {/* Yearly Payroll Chart */}
      <YearlyPayrollChart accessToken={accessToken} showComingSoon={true} />

      {/* Average Salary by Org Unit Chart */}
      <SalaryByOrgUnitChart data={salaryByOrgUnit} loading={salaryByOrgUnitLoading} error={salaryByOrgUnitError} />

      {/* Health Insurance Charts */}
      <div className="gba:mt-4">
        <Row gutter={16} className="gba:w-full">
          <Col span={12}>
            <HealthInsurerDistributionChart accessToken={accessToken} />
          </Col>
          <Col span={12}>
            <HealthInsuranceTypeDistributionChart accessToken={accessToken} />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Compensation
