// Customer Data Foundation Debug App
import React, { useState } from 'react'
import { Button, Card, Input, Alert, Spin, Typography, Space, Row, Col, Tag, Collapse, Select } from 'antd'
import {
  PlayCircleOutlined,
  SearchOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  ReloadOutlined,
  BugOutlined,
  TeamOutlined,
  UserOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Import customer data hooks
import {
  useCustomerTasks,
  useCustomerActivities,
  useCustomerTeamPerformance,
  useCustomerAccounts,
  useCustomerContacts,
  useCustomerLeads,
  useCustomerOpportunities
} from '@/common/data/customer'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

interface CustomersDebugProps extends BusinessAppContextProps {}

interface TestResult {
  name: string
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: any
  error?: string
  timestamp?: Date
  duration?: number
  query?: string
  variables?: any
}

const DEFAULT_ID = '00000000-0000-0000-0000-000000000001'

const CustomersDebug: React.FC<CustomersDebugProps> = context => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [accountId, setAccountId] = useState('')
  const [contactId, setContactId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [opportunityId, setOpportunityId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [leaderboardMetric, setLeaderboardMetric] = useState<'revenue' | 'activity_score' | 'conversion_rate'>(
    'revenue'
  )
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [conversionEmployeeIds, setConversionEmployeeIds] = useState('')

  // Hooks
  const {
    fetchCustomerTasks,
    fetchCustomerTasksByAccountId,
    fetchCustomerTasksByContactId,
    fetchCustomerTasksByLeadId,
    fetchCustomerTasksByOpportunityId
  } = useCustomerTasks(context)

  const {
    fetchCustomerActivities,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerActivitiesByContactId,
    fetchCustomerActivitiesByLeadId,
    fetchCustomerActivitiesByOpportunityId
  } = useCustomerActivities(context)

  const {
    fetchTeamPerformanceMetrics,
    fetchTeamPerformanceByEmployee,
    fetchTeamComparison,
    fetchActivityPerformanceByEmployee,
    fetchTeamPerformanceSummary,
    fetchPerformanceLeaderboard,
    fetchTeamPerformanceWithTrends,
    fetchConversionFunnelMetrics
  } = useCustomerTeamPerformance(context)

  // Entity list hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)

  // Helper executor
  const executeTest = async (testName: string, testFunction: () => Promise<any>, query?: string, variables?: any) => {
    const startTime = Date.now()
    setTestResults(prev => ({
      ...prev,
      [testName]: {
        name: testName,
        status: 'loading',
        query,
        variables
      }
    }))

    try {
      const result = await testFunction()
      const duration = Date.now() - startTime
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'success',
          data: result,
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }))
    } catch (error) {
      const duration = Date.now() - startTime
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }))
    }
  }

  // Results renderer (compact)
  const getResultComponent = (testKey: string) => {
    const result = testResults[testKey]
    if (!result) return null
    const { status, data, error, timestamp, duration, query, variables } = result

    let statusColor: 'default' | 'processing' | 'success' | 'error' = 'default'
    let statusText = 'Idle'
    if (status === 'loading') {
      statusColor = 'processing'
      statusText = 'Loading...'
    }
    if (status === 'success') {
      statusColor = 'success'
      statusText = `Success (${duration}ms)`
    }
    if (status === 'error') {
      statusColor = 'error'
      statusText = `Error (${duration}ms)`
    }

    // Attempt to derive counts
    let itemCount = 0
    if (data) {
      if (Array.isArray(data)) itemCount = data.length
      if (typeof data === 'object') {
        const arrayValues = Object.values(data).find(v => Array.isArray(v)) as any[] | undefined
        if (arrayValues) itemCount = arrayValues.length
        if ((data as any).total) itemCount = (data as any).total
      }
    }

    return (
      <Card size="small" data-testid={`customers-debug-result-${testKey}`}>
        <Space>
          <Tag color={statusColor}>{statusText}</Tag>
          {timestamp && <Text type="secondary">{timestamp.toLocaleTimeString()}</Text>}
          {status === 'success' && <Tag color="blue">{itemCount} items</Tag>}
        </Space>
        {status === 'loading' && <Spin />}
        {status === 'error' && <Alert type="error" message="Test Failed" description={error} showIcon />}
        {status === 'success' && (
          <Collapse size="small">
            <Panel header="Data" key="data">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </Panel>
            {query && (
              <Panel header="Query Info" key="query">
                <Text strong>Query:</Text>
                <pre>{query}</pre>
                {variables && (
                  <>
                    <Text strong>Variables:</Text>
                    <pre>{JSON.stringify(variables, null, 2)}</pre>
                  </>
                )}
              </Panel>
            )}
          </Collapse>
        )}
      </Card>
    )
  }

  // Test configs
  const coreTests = [
    {
      key: 'customer-accounts',
      label: 'Accounts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-accounts',
          () => fetchCustomerAccounts(variables),
          'GET_CUSTOMER_ACCOUNTS',
          variables
        )
      }
    },
    {
      key: 'customer-contacts',
      label: 'Contacts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-contacts',
          () => fetchCustomerContacts(variables),
          'GET_CUSTOMER_CONTACTS',
          variables
        )
      }
    },
    {
      key: 'customer-leads',
      label: 'Leads',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest('customer-leads', () => fetchCustomerLeads(variables), 'GET_CUSTOMER_LEADS', variables)
      }
    },
    {
      key: 'customer-opportunities',
      label: 'Opportunities',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-opportunities',
          () => fetchCustomerOpportunities(variables),
          'GET_CUSTOMER_OPPORTUNITIES',
          variables
        )
      }
    },
    {
      key: 'customer-tasks',
      label: 'Tasks',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest('customer-tasks', () => fetchCustomerTasks(variables), 'GET_CUSTOMER_TASKS', variables)
      }
    },
    {
      key: 'customer-activities',
      label: 'Activities',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'customer-activities',
          () => fetchCustomerActivities(variables),
          'GET_CUSTOMER_ACTIVITIES',
          variables
        )
      }
    }
  ]

  const byEntityTests = [
    {
      key: 'tasks-by-account',
      label: 'Tasks by Account',
      id: () => accountId || DEFAULT_ID,
      run: (id: string) =>
        executeTest('tasks-by-account', () => fetchCustomerTasksByAccountId(id), 'GET_CUSTOMER_TASKS_BY_ACCOUNT_ID', {
          accountId: id
        })
    },
    {
      key: 'tasks-by-contact',
      label: 'Tasks by Contact',
      id: () => contactId || DEFAULT_ID,
      run: (id: string) =>
        executeTest('tasks-by-contact', () => fetchCustomerTasksByContactId(id), 'GET_CUSTOMER_TASKS_BY_CONTACT_ID', {
          contactId: id
        })
    },
    {
      key: 'tasks-by-lead',
      label: 'Tasks by Lead',
      id: () => leadId || DEFAULT_ID,
      run: (id: string) =>
        executeTest('tasks-by-lead', () => fetchCustomerTasksByLeadId(id), 'GET_CUSTOMER_TASKS_BY_LEAD_ID', {
          leadId: id
        })
    },
    {
      key: 'tasks-by-opportunity',
      label: 'Tasks by Opportunity',
      id: () => opportunityId || DEFAULT_ID,
      run: (id: string) =>
        executeTest(
          'tasks-by-opportunity',
          () => fetchCustomerTasksByOpportunityId(id),
          'GET_CUSTOMER_TASKS_BY_OPPORTUNITY_ID',
          { opportunityId: id }
        )
    },
    {
      key: 'activities-by-account',
      label: 'Activities by Account',
      id: () => accountId || DEFAULT_ID,
      run: (id: string) =>
        executeTest(
          'activities-by-account',
          () => fetchCustomerActivitiesByAccountId(id),
          'GET_CUSTOMER_ACTIVITIES_BY_ACCOUNT_ID',
          { accountId: id }
        )
    },
    {
      key: 'activities-by-contact',
      label: 'Activities by Contact',
      id: () => contactId || DEFAULT_ID,
      run: (id: string) =>
        executeTest(
          'activities-by-contact',
          () => fetchCustomerActivitiesByContactId(id),
          'GET_CUSTOMER_ACTIVITIES_BY_CONTACT_ID',
          { contactId: id }
        )
    },
    {
      key: 'activities-by-lead',
      label: 'Activities by Lead',
      id: () => leadId || DEFAULT_ID,
      run: (id: string) =>
        executeTest(
          'activities-by-lead',
          () => fetchCustomerActivitiesByLeadId(id),
          'GET_CUSTOMER_ACTIVITIES_BY_LEAD_ID',
          { leadId: id }
        )
    },
    {
      key: 'activities-by-opportunity',
      label: 'Activities by Opportunity',
      id: () => opportunityId || DEFAULT_ID,
      run: (id: string) =>
        executeTest(
          'activities-by-opportunity',
          () => fetchCustomerActivitiesByOpportunityId(id),
          'GET_CUSTOMER_ACTIVITIES_BY_OPPORTUNITY_ID',
          { opportunityId: id }
        )
    }
  ]

  const performanceTests = [
    {
      key: 'team-performance-metrics',
      label: 'Team Performance Metrics',
      run: () => {
        const variables = {
          limit: 10,
          search: searchTerm || undefined,
          orderBy: [{ field: 'totalRevenue', direction: 'DESC' as const }]
        }
        return executeTest(
          'team-performance-metrics',
          () => fetchTeamPerformanceMetrics(variables),
          'GET_CUSTOMER_TEAM_PERFORMANCE_METRICS',
          variables
        )
      }
    },
    {
      key: 'team-performance-by-employee',
      label: 'Performance by Employee',
      run: () => {
        const id = employeeId || DEFAULT_ID
        return executeTest(
          'team-performance-by-employee',
          () => fetchTeamPerformanceByEmployee(id, period),
          'GET_CUSTOMER_TEAM_PERFORMANCE_BY_EMPLOYEE_ID',
          { employeeId: id, period }
        )
      }
    },
    {
      key: 'team-comparison',
      label: 'Team Comparison',
      run: () => {
        const id = teamId || DEFAULT_ID
        return executeTest(
          'team-comparison',
          () => fetchTeamComparison(id, period),
          'GET_CUSTOMER_TEAM_PERFORMANCE_COMPARISON',
          { teamId: id, period }
        )
      }
    },
    {
      key: 'activity-performance-by-employee',
      label: 'Activity Performance (Employee)',
      run: () => {
        const id = employeeId || DEFAULT_ID
        return executeTest(
          'activity-performance-by-employee',
          () => fetchActivityPerformanceByEmployee(id, period),
          'GET_CUSTOMER_ACTIVITY_PERFORMANCE_BY_EMPLOYEE',
          { employeeId: id, period }
        )
      }
    },
    {
      key: 'team-performance-summary',
      label: 'Team Performance Summary',
      run: () => {
        const id = teamId || DEFAULT_ID
        return executeTest(
          'team-performance-summary',
          () => fetchTeamPerformanceSummary(id, period),
          'GET_CUSTOMER_TEAM_PERFORMANCE_SUMMARY',
          { teamId: id, period }
        )
      }
    },
    {
      key: 'performance-leaderboard',
      label: 'Performance Leaderboard',
      run: () =>
        executeTest(
          'performance-leaderboard',
          () => fetchPerformanceLeaderboard(leaderboardMetric, period, 10),
          'GET_CUSTOMER_PERFORMANCE_LEADERBOARD',
          { metric: leaderboardMetric, period }
        )
    },
    {
      key: 'performance-with-trends',
      label: 'Performance with Trends',
      run: () => {
        const id = teamId || DEFAULT_ID
        return executeTest(
          'performance-with-trends',
          () => fetchTeamPerformanceWithTrends(id),
          'GET_CUSTOMER_TEAM_PERFORMANCE_WITH_TRENDS',
          { teamId: id }
        )
      }
    },
    {
      key: 'conversion-funnel-metrics',
      label: 'Conversion Funnel Metrics',
      run: () => {
        const ids = conversionEmployeeIds.trim()
          ? conversionEmployeeIds
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : [employeeId || DEFAULT_ID]
        return executeTest(
          'conversion-funnel-metrics',
          () => fetchConversionFunnelMetrics(ids),
          'GET_CUSTOMER_CONVERSION_FUNNEL_METRICS',
          { employeeIds: ids }
        )
      }
    }
  ]

  const clearResults = () => setTestResults({})

  const runAllCore = async () => {
    for (const t of coreTests) await t.run()
  }
  const runAllByEntity = async () => {
    for (const t of byEntityTests) await t.run(t.id())
  }
  const runAllPerformance = async () => {
    for (const t of performanceTests) await t.run()
  }

  return (
    <div data-testid="customers-debug-container">
      {/* Header */}
      <div>
        <Title level={2}>
          <BugOutlined /> Customer Data Foundation Debug
        </Title>
        <Paragraph>
          Validate the customer data foundation hooks (tasks, activities, team performance) with search and ID-based
          tests
        </Paragraph>
        {searchTerm && (
          <Alert
            type="info"
            message={`🔍 Search Active: "${searchTerm}"`}
            description="Search term applies to list queries."
            showIcon
          />
        )}
      </div>

      {/* Controls */}
      <Card
        title={
          <>
            <DatabaseOutlined /> Test Controls
          </>
        }
        data-testid="customers-debug-controls-card"
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text strong>Search Term:</Text>
            <Input
              data-testid="customers-debug-search-input"
              placeholder="Enter search term for testing..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              suffix={
                searchTerm && (
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setSearchTerm('')}
                    data-testid="customers-debug-clear-search-button"
                  >
                    ✕
                  </Button>
                )
              }
            />
          </Col>
          <Col span={8}>
            <Text strong>Entity IDs:</Text>
            <Space direction="vertical">
              <Input
                data-testid="customers-debug-account-id-input"
                placeholder="Account ID"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                prefix={<ApartmentOutlined />}
              />
              <Input
                data-testid="customers-debug-contact-id-input"
                placeholder="Contact ID"
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                prefix={<UserOutlined />}
              />
              <Input
                data-testid="customers-debug-lead-id-input"
                placeholder="Lead ID"
                value={leadId}
                onChange={e => setLeadId(e.target.value)}
                prefix={<UserOutlined />}
              />
              <Input
                data-testid="customers-debug-opportunity-id-input"
                placeholder="Opportunity ID"
                value={opportunityId}
                onChange={e => setOpportunityId(e.target.value)}
                prefix={<ApartmentOutlined />}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Text strong>Performance Params:</Text>
            <Space direction="vertical">
              <Input
                data-testid="customers-debug-employee-id-input"
                placeholder="Employee ID"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                prefix={<UserOutlined />}
              />
              <Input
                data-testid="customers-debug-team-id-input"
                placeholder="Team ID"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                prefix={<TeamOutlined />}
              />
              <Space>
                <Select
                  value={leaderboardMetric}
                  onChange={v => setLeaderboardMetric(v)}
                  data-testid="customers-debug-leaderboard-metric-select"
                  options={[
                    { label: 'Revenue', value: 'revenue' },
                    { label: 'Activity Score', value: 'activity_score' },
                    { label: 'Conversion Rate', value: 'conversion_rate' }
                  ]}
                />
                <Select
                  value={period}
                  onChange={v => setPeriod(v)}
                  data-testid="customers-debug-period-select"
                  options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Quarterly', value: 'quarterly' },
                    { label: 'Yearly', value: 'yearly' }
                  ]}
                />
              </Space>
              <Input
                data-testid="customers-debug-conversion-employee-ids-input"
                placeholder="Conversion Funnel Employee IDs (comma-separated)"
                value={conversionEmployeeIds}
                onChange={e => setConversionEmployeeIds(e.target.value)}
              />
              <Space>
                <Button data-testid="customers-debug-run-core-button" type="primary" onClick={runAllCore}>
                  Run Core
                </Button>
                <Button data-testid="customers-debug-run-entity-button" type="primary" onClick={runAllByEntity}>
                  Run Entity
                </Button>
                <Button
                  data-testid="customers-debug-run-performance-button"
                  type="primary"
                  onClick={runAllPerformance}
                  icon={<LineChartOutlined />}
                >
                  Run Performance
                </Button>
                <Button
                  data-testid="customers-debug-clear-results-button"
                  onClick={clearResults}
                  icon={<ReloadOutlined />}
                >
                  Clear
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Test Sections */}
      <Collapse defaultActiveKey={['core']} data-testid="customers-debug-test-sections">
        <Panel header="Core Customer Data Tests" key="core">
          <Row gutter={[16, 16]}>
            {coreTests.map(t => (
              <Col span={6} key={t.key}>
                <Button
                  data-testid={`customers-debug-${t.key}-button`}
                  onClick={t.run}
                  loading={testResults[t.key]?.status === 'loading'}
                  icon={<PlayCircleOutlined />}
                  block
                >
                  {t.label}
                </Button>
                {getResultComponent(t.key)}
              </Col>
            ))}
          </Row>
        </Panel>

        <Panel header="By Entity Tests" key="entity">
          <Row gutter={[16, 16]}>
            {byEntityTests.map(t => (
              <Col span={6} key={t.key}>
                <Button
                  data-testid={`customers-debug-${t.key}-button`}
                  onClick={() => t.run(t.id())}
                  loading={testResults[t.key]?.status === 'loading'}
                  icon={<PlayCircleOutlined />}
                  block
                >
                  {t.label}
                </Button>
                {getResultComponent(t.key)}
              </Col>
            ))}
          </Row>
        </Panel>

        <Panel header="Team Performance Tests" key="performance">
          <Row gutter={[16, 16]}>
            {performanceTests.map(t => (
              <Col span={6} key={t.key}>
                <Button
                  data-testid={`customers-debug-${t.key}-button`}
                  onClick={t.run}
                  loading={testResults[t.key]?.status === 'loading'}
                  icon={<PlayCircleOutlined />}
                  block
                >
                  {t.label}
                </Button>
                {getResultComponent(t.key)}
              </Col>
            ))}
          </Row>
        </Panel>
      </Collapse>
    </div>
  )
}

export default CustomersDebug
