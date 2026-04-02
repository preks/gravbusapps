// Content Data Foundation Debug App
import React, { useState } from 'react'
import { Button, Card, Input, Alert, Typography, Space, Row, Col, Tag, Collapse, Select } from 'antd'
import {
  PlayCircleIcon,
  MagnifyingGlassIcon,
  DatabaseIcon,
  ArrowsClockwiseIcon,
  BugIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildContentEntriesQuery,
  buildContentEntryQuery,
  buildContentDocumentsQuery,
  buildContentReactionsQuery,
  buildContentStatisticsQuery,
  buildChildContentEntriesQuery
} from '@/common/data/content/queries/contentQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ContentDebugProps extends BusinessAppContextProps {}

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

const ContentDebug: React.FC<ContentDebugProps> = context => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [contentEntryId, setContentEntryId] = useState('')
  const [role, setRole] = useState<string | undefined>(undefined)
  const [contentGroup, setContentGroup] = useState('')
  const [contentTypeId, setContentTypeId] = useState('')

  const graphqlClient = useGraphQLClient(context.accessToken)

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

  // Helper to get status info
  const getStatusInfo = (status: string, duration?: number) => {
    if (status === 'loading') {
      return { color: 'processing' as const, text: 'Loading...' }
    }
    if (status === 'success') {
      return { color: 'success' as const, text: `Success (${duration}ms)` }
    }
    if (status === 'error') {
      return { color: 'error' as const, text: `Error (${duration}ms)` }
    }
    return { color: 'default' as const, text: 'Idle' }
  }

  // Helper to derive item count
  const getItemCount = (data: any): number => {
    if (!data) return 0
    if (Array.isArray(data)) return data.length
    if (typeof data === 'object') {
      const arrayValues = Object.values(data).find(v => Array.isArray(v))
      if (Array.isArray(arrayValues)) return arrayValues.length
      if ('total' in data && typeof data.total === 'number') return data.total
    }
    return 0
  }

  // Results renderer (compact)
  const getResultComponent = (testKey: string) => {
    const result = testResults[testKey]
    if (!result) return null
    const { status, data, error, timestamp, duration, query, variables } = result

    const { color: statusColor, text: statusText } = getStatusInfo(status, duration)
    const itemCount = getItemCount(data)

    return (
      <Card size="small" data-testid={`content-debug-result-${testKey}`}>
        <Space>
          <Tag color={statusColor}>{statusText}</Tag>
          {timestamp && <Text type="secondary">{timestamp.toLocaleTimeString()}</Text>}
          {status === 'success' && <Tag className="gba:bg-info gba:text-info-foreground">{itemCount} items</Tag>}
        </Space>
        {status === 'error' && <Alert type="error" message="Test Failed" description={error} showIcon />}
        {status === 'success' && (
          <Collapse size="small">
            <Panel header="Data" key="data">
              <pre style={{ maxHeight: '400px', overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>
            </Panel>
            {query && (
              <Panel header="Query Info" key="query">
                <Text strong>Query:</Text>
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>{query}</pre>
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
      key: 'content-entries',
      label: 'Content Entries',
      run: () => {
        const variables = {
          limit: 10,
          search: searchTerm || undefined,
          role: role || undefined,
          contentGroup: contentGroup || undefined,
          contentTypeId: contentTypeId || undefined
        }
        const query = buildContentEntriesQuery(variables)
        return executeTest('content-entries', () => graphqlClient.request(query), 'GET_CONTENT_ENTRIES', variables)
      }
    },
    {
      key: 'content-entry-by-id',
      label: 'Content Entry by ID',
      run: () => {
        const id = contentEntryId || DEFAULT_ID
        const query = buildContentEntryQuery(id)
        return executeTest('content-entry-by-id', () => graphqlClient.request(query), 'GET_CONTENT_ENTRY', { id })
      }
    },
    {
      key: 'child-content-entries',
      label: 'Child Entries (Comments)',
      run: () => {
        const id = contentEntryId || DEFAULT_ID
        const query = buildChildContentEntriesQuery(id, 50, 0)
        return executeTest('child-content-entries', () => graphqlClient.request(query), 'GET_CHILD_CONTENT_ENTRIES', {
          parentId: id
        })
      }
    },
    {
      key: 'content-documents',
      label: 'Content Documents',
      run: () => {
        const variables = {
          contentEntryId: contentEntryId || undefined,
          limit: 10,
          search: searchTerm || undefined
        }
        const query = buildContentDocumentsQuery(variables)
        return executeTest('content-documents', () => graphqlClient.request(query), 'GET_CONTENT_DOCUMENTS', variables)
      }
    },
    {
      key: 'content-reactions',
      label: 'Content Reactions',
      run: () => {
        const variables = {
          contentEntryId: contentEntryId || DEFAULT_ID
        }
        const query = buildContentReactionsQuery(variables)
        return executeTest('content-reactions', () => graphqlClient.request(query), 'GET_CONTENT_REACTIONS', variables)
      }
    },
    {
      key: 'content-statistics',
      label: 'Content Statistics',
      run: () => {
        const query = buildContentStatisticsQuery()
        return executeTest('content-statistics', () => graphqlClient.request(query), 'GET_CONTENT_STATISTICS', {})
      }
    }
  ]

  const clearResults = () => setTestResults({})

  const runAllTests = async () => {
    for (const t of coreTests) await t.run()
  }

  return (
    <div data-testid="content-debug-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div>
        <Title level={2}>
          <BugIcon size={20} /> Content Data Foundation Debug
        </Title>
        <Paragraph>
          Validate the content data foundation queries (entries, documents, reactions) with real data from GraphQL
          backend
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
            <DatabaseIcon size={20} /> Test Controls
          </>
        }
        data-testid="content-debug-controls-card"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Search Term:</Text>
              <Input
                data-testid="content-debug-search-input"
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                prefix={<MagnifyingGlassIcon size={16} />}
              />
              <Text strong>Content Entry ID:</Text>
              <Input
                data-testid="content-debug-entry-id-input"
                placeholder="Content Entry ID"
                value={contentEntryId}
                onChange={e => setContentEntryId(e.target.value)}
                prefix={<FileTextIcon size={16} />}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Role:</Text>
              <Select
                data-testid="content-debug-role-select"
                style={{ width: '100%' }}
                placeholder="Select role"
                value={role}
                onChange={v => setRole(v)}
                allowClear
                options={[
                  { label: 'Root Content', value: 'ROOT_CONTENT_ROLE' },
                  { label: 'Comment', value: 'COMMENT_CONTENT_ROLE' },
                  { label: 'Unknown', value: 'UNKNOWN_CONTENT_ROLE' }
                ]}
              />
              <Text strong>Content Group Ref:</Text>
              <Input
                data-testid="content-debug-group-ref-input"
                placeholder="Content Group"
                value={contentGroup}
                onChange={e => setContentGroup(e.target.value)}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Content Type Ref:</Text>
              <Input
                data-testid="content-debug-type-ref-input"
                placeholder="Content Type ID"
                value={contentTypeId}
                onChange={e => setContentTypeId(e.target.value)}
              />
              <div style={{ marginTop: '24px' }}>
                <Space>
                  <Button
                    data-testid="content-debug-run-all-button"
                    type="primary"
                    onClick={runAllTests}
                    icon={<PlayCircleIcon size={16} />}
                  >
                    Run All Tests
                  </Button>
                  <Button
                    data-testid="content-debug-clear-results-button"
                    onClick={clearResults}
                    icon={<ArrowsClockwiseIcon size={16} />}
                  >
                    Clear Results
                  </Button>
                </Space>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Test Sections */}
      <Collapse defaultActiveKey={['core']} data-testid="content-debug-test-sections">
        <Panel header="Content Data Tests" key="core">
          <Row gutter={[16, 16]}>
            {coreTests.map(t => (
              <Col span={6} key={t.key}>
                <Button
                  data-testid={`content-debug-${t.key}-button`}
                  onClick={t.run}
                  loading={testResults[t.key]?.status === 'loading'}
                  icon={<PlayCircleIcon size={16} />}
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

export default ContentDebug
