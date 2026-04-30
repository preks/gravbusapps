import { Alert, Card, Col, Empty, Row, Select, Skeleton, Statistic, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { HeadcountChangesChart } from '../components/HeadcountChangesChart'
import { useWorkingConditionForecast, WorkingConditionKpi } from '../../../hooks/useWorkingConditionForecast'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'

const { Text, Title } = Typography

type ScenarioId = 'steady' | 'growth' | 'efficiency'

interface WorkforceForecastingProps {
  props: BusinessAppContextProps
}

interface WorkforceForecastMonth {
  month: string
  startHeadcount: number
  hires: number
  exits: number
  netChange: number
  endHeadcount: number
}

const scenarioOptions: Array<{ value: ScenarioId; label: string }> = [
  { value: 'steady', label: 'Steady state' },
  { value: 'growth', label: 'Growth push' },
  { value: 'efficiency', label: 'Efficiency plan' }
]

const scenarioConfig: Record<ScenarioId, { hiringMultiplier: number; attritionMultiplier: number }> = {
  steady: { hiringMultiplier: 1, attritionMultiplier: 1 },
  growth: { hiringMultiplier: 1.45, attritionMultiplier: 0.9 },
  efficiency: { hiringMultiplier: 0.65, attritionMultiplier: 1.1 }
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const getDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const getAverage = (values: number[]) => {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const buildForecast = (workingConditions: WorkingConditionKpi[], currentHeadcount: number, scenario: ScenarioId) => {
  const now = new Date()
  const activeRecords = workingConditions.filter((item) => !item.exitDate || (getDate(item.exitDate)?.getTime() || 0) > now.getTime())
  const salaries = activeRecords
    .map((item) => item.annualGrossSalary || (item.monthlyGrossSalary ? item.monthlyGrossSalary * 12 : 0))
    .filter((salary) => salary > 0)
  const averageSalary = getAverage(salaries)
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setFullYear(now.getFullYear() - 1)

  const recentHires = workingConditions.filter((item) => {
    const hireDate = getDate(item.hireDate)

    return hireDate && hireDate >= twelveMonthsAgo && hireDate <= now
  }).length
  const recentExits = workingConditions.filter((item) => {
    const exitDate = getDate(item.exitDate)

    return exitDate && exitDate >= twelveMonthsAgo && exitDate <= now
  }).length

  const config = scenarioConfig[scenario]
  const monthlyHireRate = Math.max(recentHires / 12, currentHeadcount * 0.012, 1) * config.hiringMultiplier
  const monthlyExitRate = Math.max(recentExits / 12, currentHeadcount * 0.008, 0.5) * config.attritionMultiplier
  const forecast = monthLabels.map<WorkforceForecastMonth>((month, index) => {
    const startHeadcount = index === 0 ? currentHeadcount : 0

    return {
      month,
      startHeadcount,
      hires: Math.round(monthlyHireRate),
      exits: Math.round(monthlyExitRate) * -1,
      netChange: 0,
      endHeadcount: 0
    }
  })

  let runningHeadcount = currentHeadcount
  forecast.forEach((month) => {
    month.startHeadcount = runningHeadcount
    month.netChange = month.hires + month.exits
    runningHeadcount = Math.max(0, runningHeadcount + month.netChange)
    month.endHeadcount = runningHeadcount
  })

  const totalHires = forecast.reduce((sum, month) => sum + month.hires, 0)
  const totalExits = Math.abs(forecast.reduce((sum, month) => sum + month.exits, 0))
  const netChange = forecast.reduce((sum, month) => sum + month.netChange, 0)
  const salaryImpact = netChange * averageSalary

  return {
    forecast,
    totalHires,
    totalExits,
    netChange,
    projectedHeadcount: runningHeadcount,
    averageSalary,
    salaryImpact
  }
}

export function WorkforceForecasting({ props }: WorkforceForecastingProps) {
  const [scenario, setScenario] = useState<ScenarioId>('steady')
  const { data, count, loading, error } = useWorkingConditionForecast(props)
  const forecast = useMemo(() => buildForecast(data, count, scenario), [count, data, scenario])

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (error) {
    return <Alert type="error" showIcon message="Unable to load workforce forecast" description="Please try again later." />
  }

  if (count === 0) {
    return <Empty description="No working condition data available for forecasting" />
  }

  return (
    <div className="tw-space-y-4">
      <Row gutter={[16, 16]} align="middle">
        <Col flex="auto">
          <Title level={4} className="tw-mb-1">
            Workforce scenario planner
          </Title>
          <Text type="secondary">Project six-month headcount, hiring, exits, and salary impact from current HR data.</Text>
        </Col>
        <Col>
          <Select value={scenario} options={scenarioOptions} onChange={setScenario} className="tw-min-w-48" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Current headcount" value={count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Projected headcount"
              value={forecast.projectedHeadcount}
              suffix={<Tag color={forecast.netChange >= 0 ? 'green' : 'red'}>{forecast.netChange >= 0 ? `+${forecast.netChange}` : forecast.netChange}</Tag>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Planned hires" value={forecast.totalHires} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Expected exits" value={forecast.totalExits} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card title="Six-month headcount movement" extra={<Text type="secondary">Scenario: {scenarioOptions.find((option) => option.value === scenario)?.label}</Text>}>
        <HeadcountChangesChart data={forecast.forecast} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Hiring capacity signal">
            <Text>
              This plan adds <Text strong>{forecast.totalHires}</Text> hires and anticipates <Text strong>{forecast.totalExits}</Text> exits, ending at <Text strong>{forecast.projectedHeadcount}</Text> employees.
            </Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Estimated salary run-rate impact">
            <Statistic
              value={Math.round(forecast.salaryImpact)}
              precision={0}
              prefix={forecast.salaryImpact >= 0 ? '+' : ''}
              suffix="/ year"
              valueStyle={{ color: forecast.salaryImpact >= 0 ? '#1677ff' : '#fa8c16' }}
            />
            <Text type="secondary">Based on average annual salary from current working conditions.</Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
