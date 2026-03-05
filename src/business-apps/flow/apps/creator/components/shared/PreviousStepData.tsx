import React, { useState, useEffect } from 'react'
import { Table, Card, Typography, Tag, Space, Button, Tooltip, Collapse, Spin, Alert } from 'antd'
import { ClockCounterClockwiseIcon, DownloadIcon, UserIcon, CalendarIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowProgressClient, StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const { Title, Text } = Typography
const { Panel } = Collapse

interface PreviousStepDataProps extends BusinessAppContextProps {
  flowId: string
  currentStepIndex: number
  maxDisplayUsers?: number
  'data-testid'?: string
}

export const PreviousStepData: React.FC<PreviousStepDataProps> = ({
  flowId,
  currentStepIndex,
  maxDisplayUsers = 10,
  'data-testid': testId = 'previous-step-data',
  ...context
}) => {
  const [stepDataMap, setStepDataMap] = useState<Map<number, StepDataResponse>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const flowClient = useFlowProgressClient(context)
  const prefixDataTestId = formatDataTestId(testId)

  useEffect(() => {
    loadPreviousStepsData()
  }, [flowId, currentStepIndex])

  const loadPreviousStepsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const dataMap = new Map<number, StepDataResponse>()

      // Load data for all previous steps using new clean API
      for (let stepIndex = 0; stepIndex < currentStepIndex; stepIndex++) {
        try {
          // Use new clean API with step reference
          const stepReference = `step_${stepIndex}`
          const stepData = await flowClient.getStepDataByReference(flowId, stepReference, {
            limit: maxDisplayUsers
          })

          if (stepData.totalCount > 0) {
            dataMap.set(stepIndex, stepData)
          }
        } catch (stepError) {
          console.warn(`Could not load data for step ${stepIndex} (${stepReference}):`, stepError)

          // Fallback to legacy API if new API fails
          try {
            const stepData = await flowClient.getStepDataJson(flowId, stepIndex, {
              limit: maxDisplayUsers
            })

            if (stepData.totalCount > 0) {
              dataMap.set(stepIndex, stepData)
            }
          } catch (fallbackError) {
            console.warn(`Fallback also failed for step ${stepIndex}:`, fallbackError)
          }
        }
      }

      setStepDataMap(dataMap)
    } catch (err) {
      console.error('Error loading previous step data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load previous step data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportStep = (stepIndex: number) => {
    // Use new clean API with step reference, fallback to legacy
    const stepReference = `step_${stepIndex}`
    try {
      const exportUrl = flowClient.getExportUrlByReference(flowId, stepReference)
      window.open(exportUrl, '_blank')
    } catch (error) {
      // Fallback to legacy API
      const exportUrl = flowClient.getExportUrl(flowId, stepIndex)
      window.open(exportUrl, '_blank')
    }
  }

  const renderStepData = (stepIndex: number, stepData: StepDataResponse) => {
    const { data, totalCount, hasMore } = stepData

    if (data.length === 0) {
      return (
        <div className="gba:text-center gba:py-4">
          <Text type="secondary">No completed tasks for this step</Text>
        </div>
      )
    }

    // Create columns from the first data item
    const firstItem = data[0]
    const inputFields = Object.keys(firstItem.inputData || {})

    const columns = [
      {
        title: 'User',
        dataIndex: 'userName',
        key: 'userName',
        width: 140,
        fixed: 'left' as const,
        render: (text: string, record: any) => (
          <Space direction="vertical" size="small">
            <div className="gba:flex gba:items-center gba:gap-2">
              <UserIcon size={16} className="gba:text-blue-500" />
              <span className="gba:font-medium">{text}</span>
            </div>
            <Text type="secondary" className="gba:text-xs">
              {record.userId}
            </Text>
          </Space>
        )
      },
      {
        title: 'Completed',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 160,
        render: (timestamp: string) => (
          <Space direction="vertical" size="small">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CalendarIcon className="gba:text-green-500" />
              <span className="gba:text-sm">{new Date(timestamp).toLocaleDateString()}</span>
            </div>
            <Text type="secondary" className="gba:text-xs">
              {new Date(timestamp).toLocaleTimeString()}
            </Text>
          </Space>
        )
      },
      ...inputFields.map(field => ({
        title: field.charAt(0).toUpperCase() + field.slice(1),
        dataIndex: ['inputData', field],
        key: field,
        ellipsis: true,
        width: 200,
        render: (value: any) => {
          if (value === null || value === undefined) {
            return <Text type="secondary">—</Text>
          }
          if (Array.isArray(value)) {
            return (
              <div className="gba:space-y-1">
                {value.map((item, idx) => (
                  <Tag key={idx}>{String(item)}</Tag>
                ))}
              </div>
            )
          }
          if (typeof value === 'object') {
            return (
              <Tooltip title={JSON.stringify(value, null, 2)}>
                <Text ellipsis>{JSON.stringify(value)}</Text>
              </Tooltip>
            )
          }

          const stringValue = String(value)
          if (stringValue.length > 50) {
            return (
              <Tooltip title={stringValue}>
                <Text ellipsis>{stringValue}</Text>
              </Tooltip>
            )
          }

          return stringValue
        }
      }))
    ]

    return (
      <div className="gba:space-y-4">
        <div className="gba:flex gba:justify-between gba:items-center">
          <Space>
            <Text strong>
              {data.length} completed task{data.length !== 1 ? 's' : ''}
            </Text>
            {totalCount > data.length && (
              <Text type="secondary">
                (showing {data.length} of {totalCount})
              </Text>
            )}
          </Space>
          <Button
            icon={<DownloadIcon size={16} />}
            size="small"
            onClick={() => handleExportStep(stepIndex)}
            data-testid={`${prefixDataTestId}-export-step-${stepIndex}`}
          >
            Export All
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="taskId"
          size="small"
          pagination={false}
          scroll={{ x: true, y: 300 }}
          className="gba:border gba:border-gray-200 gba:rounded"
        />

        {hasMore && (
          <div className="gba:text-center gba:pt-2 gba:border-t gba:border-gray-100">
            <Text type="secondary" className="gba:block gba:mb-2">
              {totalCount - data.length} more record{totalCount - data.length !== 1 ? 's' : ''} available
            </Text>
            <Button size="small" onClick={() => handleExportStep(stepIndex)} icon={<DownloadIcon size={16} />}>
              Export all {totalCount} records
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card data-testid={prefixDataTestId}>
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spin size="large" />
          <Text className="gba:ml-3">Loading previous step data...</Text>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={prefixDataTestId}>
        <Alert
          message="Error Loading Previous Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadPreviousStepsData} icon={<ArrowsClockwiseIcon size={16} />}>
              Retry
            </Button>
          }
        />
      </Card>
    )
  }

  if (stepDataMap.size === 0) {
    return (
      <Card data-testid={prefixDataTestId}>
        <div className="gba:text-center gba:py-8">
          <ClockCounterClockwiseIcon size={40} className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <Title level={4} type="secondary">
            No Previous Step Data
          </Title>
          <Text type="secondary">No completed tasks found in previous steps of this workflow.</Text>
        </div>
      </Card>
    )
  }

  return (
    <div data-testid={prefixDataTestId} className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <ClockCounterClockwiseIcon size={18} className="gba:text-lg gba:text-blue-500" />
        <Title level={5} className="gba:mb-0">
          Previous Step Data
        </Title>
        <Tag color="blue">
          {stepDataMap.size} step{stepDataMap.size !== 1 ? 's' : ''} with data
        </Tag>
      </div>

      <Collapse defaultActiveKey={Array.from(stepDataMap.keys()).map(String)} className="gba:bg-gray-50">
        {Array.from(stepDataMap.entries()).map(([stepIndex, stepData]) => (
          <Panel
            key={stepIndex}
            header={
              <Space>
                <Text strong>Step {stepIndex + 1}</Text>
                <Tag color="green">{stepData.data.length} completed</Tag>
                {stepData.totalCount > stepData.data.length && (
                  <Tag color="orange">+{stepData.totalCount - stepData.data.length} more</Tag>
                )}
              </Space>
            }
            extra={
              <Tooltip title="Export all data for this step">
                <Button
                  icon={<DownloadIcon size={16} />}
                  size="small"
                  type="text"
                  onClick={e => {
                    e.stopPropagation()
                    handleExportStep(stepIndex)
                  }}
                />
              </Tooltip>
            }
          >
            {renderStepData(stepIndex, stepData)}
          </Panel>
        ))}
      </Collapse>
    </div>
  )
}
