import React, { useState, useEffect } from 'react'
import { Progress, Card, Steps, Tag, Typography, Space, Button, Tooltip, Spin, Alert } from 'antd'
import {ArrowClockwiseIcon, ArrowsClockwiseIcon, CheckCircleIcon, ClockIcon, DownloadIcon, PlayCircleIcon} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowProgressClient, FlowOverview } from '@/common/network/flows/useFlowProgressClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { PreviousStepData } from './PreviousStepData'

const { Title, Text } = Typography
const { Step } = Steps

interface FlowProgressProps extends BusinessAppContextProps {
  flowId: string
  showExport?: boolean
  compact?: boolean
  refreshInterval?: number // Auto-refresh in milliseconds
  'data-testid'?: string
}

export const FlowProgress: React.FC<FlowProgressProps> = ({
  flowId,
  showExport = true,
  compact = false,
  refreshInterval,
  'data-testid': testId = 'flow-progress',
  ...context
}) => {
  const [flowData, setFlowData] = useState<FlowOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const flowClient = useFlowProgressClient(context)
  const prefixDataTestId = formatDataTestId(testId)

  useEffect(() => {
    loadFlowData()

    // Set up auto-refresh if specified
    let interval: NodeJS.Timeout | undefined
    if (refreshInterval && refreshInterval > 0) {
      interval = setInterval(loadFlowData, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [flowId, refreshInterval])

  const loadFlowData = async () => {
    try {
      if (!loading) setLoading(true)
      setError(null)
      const data = await flowClient.getFlowOverview(flowId)
      setFlowData(data)
    } catch (err) {
      console.error('Error loading flow data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load flow data')
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon size={16} className="gba:text-green-500" />
      case 'IN_PROGRESS':
        return <PlayCircleIcon className="gba:text-blue-500" />
      case 'SCHEDULED':
        return <ClockIcon size={16} className="gba:text-orange-500" />
      case 'QUEUED':
        return <ClockIcon size={16} className="gba:text-gray-400" />
      default:
        return <ClockIcon size={16} className="gba:text-gray-400" />
    }
  }

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'finish'
      case 'IN_PROGRESS':
      case 'SCHEDULED':
        return 'process'
      case 'QUEUED':
        return 'wait'
      default:
        return 'wait'
    }
  }

  const handleExport = () => {
    const exportUrl = flowClient.getExportUrl(flowId)
    window.open(exportUrl, '_blank')
  }

  if (loading && !flowData) {
    return (
      <Card loading={true} data-testid={prefixDataTestId}>
        <div style={{ height: compact ? '100px' : '200px' }} />
      </Card>
    )
  }

  if (error || !flowData) {
    return (
      <Card data-testid={prefixDataTestId}>
        <Alert
          message="Error Loading Flow Data"
          description={error || 'No flow data available'}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadFlowData} icon={<ArrowsClockwiseIcon size={16} />}>
              Retry
            </Button>
          }
        />
      </Card>
    )
  }

  if (compact) {
    return (
      <Card size="small" data-testid={prefixDataTestId}>
        <div className="gba:space-y-3">
          <div className="gba:flex gba:justify-between gba:items-center">
            <Text strong className="gba:text-sm">
              {flowData.name}
            </Text>
            <Tag color={flowData.status === 'RUNNING' ? 'processing' : 'default'}>{flowData.status}</Tag>
          </div>

          <div>
            <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
              <Text className="gba:text-xs">Progress</Text>
              <Text className="gba:text-xs">{flowData.progress.percentage}%</Text>
            </div>
            <Progress
              percent={flowData.progress.percentage}
              size="small"
              status={flowData.status === 'RUNNING' ? 'active' : 'normal'}
            />
            <Text type="secondary" className="gba:text-xs">
              {flowData.progress.completedSteps} of {flowData.progress.totalSteps} steps
            </Text>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space className="gba:w-full gba:justify-between">
          <div>
            <Title level={4} className="gba:mb-0">
              {flowData.name}
            </Title>
            <Text type="secondary" className="gba:text-sm">
              Flow ID: {flowData.id}
            </Text>
          </div>
          <Space>
            <Tag color={flowData.status === 'RUNNING' ? 'processing' : 'default'}>{flowData.status}</Tag>
            {refreshInterval && (
              <Tooltip title="Auto-refreshing">
                <Button icon={<ArrowClockwiseIcon spin={loading} />} size="small" type="text" onClick={loadFlowData} />
              </Tooltip>
            )}
            {showExport && (
              <Button
                icon={<DownloadIcon size={16} />}
                onClick={handleExport}
                size="small"
                data-testid={`${prefixDataTestId}-export-button`}
              >
                Export
              </Button>
            )}
          </Space>
        </Space>
      }
      data-testid={prefixDataTestId}
    >
      <div className="gba:space-y-6">
        {/* Overall Progress */}
        <div data-testid={`${prefixDataTestId}-overall-progress`}>
          <div className="gba:flex gba:justify-between gba:mb-2">
            <Text strong>Overall Progress</Text>
            <Text>{flowData.progress.percentage}%</Text>
          </div>
          <Progress
            percent={flowData.progress.percentage}
            status={flowData.status === 'RUNNING' ? 'active' : 'normal'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068'
            }}
          />
          <div className="gba:mt-2">
            <Text type="secondary">
              {flowData.progress.completedSteps} of {flowData.progress.totalSteps} steps completed
            </Text>
          </div>
        </div>

        {/* Step Timeline */}
        {flowData.steps.length > 0 && (
          <div data-testid={`${prefixDataTestId}-steps`}>
            <Title level={5}>Step Progress</Title>
            <div className="gba:space-y-3">
              {flowData.steps.map(step => (
                <div
                  key={step.stepIndex}
                  className="gba:border gba:border-gray-200 gba:rounded-lg gba:p-3"
                  data-testid={`${prefixDataTestId}-step-${step.stepIndex}`}
                >
                  {/* Clean Step Header Only */}
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {getStepIcon(step.status)}
                      <Text strong>{step.title}</Text>
                      <Tag color="blue">{step.type}</Tag>
                      <Tag
                        color={
                          step.status === 'COMPLETED'
                            ? 'success'
                            : step.status === 'IN_PROGRESS'
                              ? 'processing'
                              : step.status === 'SCHEDULED'
                                ? 'warning'
                                : 'default'
                        }
                      >
                        {step.status}
                      </Tag>
                    </div>
                    <Text className="gba:text-xs gba:text-gray-500">Step {step.stepIndex + 1}</Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
