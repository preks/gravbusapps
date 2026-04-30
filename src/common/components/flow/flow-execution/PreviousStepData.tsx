import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  ArrowsClockwiseIcon,
  CalendarIcon,
  ClockCounterClockwiseIcon,
  DownloadIcon,
  UserIcon
} from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowProgressClient, type StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const MAX_INLINE_VALUE_LENGTH = 50

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

  const loadPreviousStepsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const dataMap = new Map<number, StepDataResponse>()

      for (let stepIndex = 0; stepIndex < currentStepIndex; stepIndex++) {
        const stepReference = `step_${stepIndex}`

        try {
          const stepData = await flowClient.getStepDataByReference(flowId, stepReference, {
            limit: maxDisplayUsers
          })

          if (stepData.totalCount > 0) {
            dataMap.set(stepIndex, stepData)
          }
        } catch (stepError) {
          console.warn(`Could not load data for step ${stepIndex} (${stepReference}):`, stepError)

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
    } catch (loadError) {
      console.error('Error loading previous step data:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load previous step data')
    } finally {
      setLoading(false)
    }
  }, [currentStepIndex, flowClient, flowId, maxDisplayUsers])

  useEffect(() => {
    void loadPreviousStepsData()
  }, [loadPreviousStepsData])

  const handleExportStep = (stepIndex: number) => {
    const stepReference = `step_${stepIndex}`

    try {
      const exportUrl = flowClient.getExportUrlByReference(flowId, stepReference)
      window.open(exportUrl, '_blank')
    } catch {
      const exportUrl = flowClient.getExportUrl(flowId, stepIndex)
      window.open(exportUrl, '_blank')
    }
  }

  const expandedStepKeys = useMemo(
    () => Array.from(stepDataMap.keys()).map(stepIndex => `step-${stepIndex}`),
    [stepDataMap]
  )

  const renderValue = (value: any, fieldKey: string) => {
    if (value === null || value === undefined) {
      return <span className="gba:text-sm gba:text-muted-foreground">-</span>
    }

    if (Array.isArray(value)) {
      return (
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {value.map((item, itemIndex) => (
            <Badge key={`${fieldKey}-${itemIndex}-${String(item)}`} variant="secondary">
              {String(item)}
            </Badge>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      const serializedValue = safeJsonStringify(value)
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="gba:max-w-[220px] gba:truncate gba:text-left gba:text-sm gba:text-foreground gba:bg-transparent gba:border-0 gba:p-0"
            >
              {safeJsonStringify(value, 0)}
            </button>
          </TooltipTrigger>
          <TooltipContent className="gba:max-w-md">
            <pre className="gba:max-h-64 gba:overflow-auto gba:text-xs">{serializedValue}</pre>
          </TooltipContent>
        </Tooltip>
      )
    }

    const stringValue = String(value)
    if (stringValue.length > MAX_INLINE_VALUE_LENGTH) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="gba:max-w-[220px] gba:truncate gba:text-left gba:text-sm gba:text-foreground gba:bg-transparent gba:border-0 gba:p-0"
            >
              {stringValue}
            </button>
          </TooltipTrigger>
          <TooltipContent>{stringValue}</TooltipContent>
        </Tooltip>
      )
    }

    return <span className="gba:text-sm">{stringValue}</span>
  }

  const renderStepData = (stepIndex: number, stepData: StepDataResponse) => {
    const { data, totalCount, hasMore } = stepData

    if (data.length === 0) {
      return (
        <div className="gba:py-4 gba:text-center">
          <span className="gba:text-sm gba:text-muted-foreground">No completed tasks for this step</span>
        </div>
      )
    }

    const firstItem = data[0]
    const inputFields = Object.keys(firstItem.inputData || {})

    return (
      <div className="gba:space-y-4">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium">
              {data.length} completed task{data.length !== 1 ? 's' : ''}
            </span>
            {totalCount > data.length && (
              <span className="gba:text-sm gba:text-muted-foreground">
                (showing {data.length} of {totalCount})
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportStep(stepIndex)}
            data-testid={`${prefixDataTestId}-export-step-${stepIndex}`}
          >
            <DownloadIcon size={16} />
            Export All
          </Button>
        </div>

        <div className="gba:overflow-auto gba:max-h-80 gba:rounded-lg gba:border">
          <Table className="gba:min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:min-w-[180px]">User</TableHead>
                <TableHead className="gba:min-w-[180px]">Completed</TableHead>
                {inputFields.map(field => (
                  <TableHead key={field} className="gba:min-w-[200px]">
                    {formatFieldLabel(field)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(record => (
                <TableRow key={record.taskId}>
                  <TableCell className="gba:align-top">
                    <div className="gba:space-y-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <UserIcon size={16} className="gba:text-muted-foreground" />
                        <span className="gba:font-medium">{record.userName}</span>
                      </div>
                      <span className="gba:block gba:text-xs gba:text-muted-foreground">{record.userId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:align-top">
                    <div className="gba:space-y-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <CalendarIcon size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{new Date(record.timestamp).toLocaleDateString()}</span>
                      </div>
                      <span className="gba:block gba:text-xs gba:text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  {inputFields.map(field => (
                    <TableCell key={`${record.taskId}-${field}`} className="gba:align-top">
                      {renderValue(record.inputData?.[field], field)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {hasMore && (
          <div className="gba:border-t gba:pt-2 gba:text-center">
            <span className="gba:mb-2 gba:block gba:text-sm gba:text-muted-foreground">
              {totalCount - data.length} more record{totalCount - data.length !== 1 ? 's' : ''} available
            </span>
            <Button variant="outline" size="sm" onClick={() => handleExportStep(stepIndex)}>
              <DownloadIcon size={16} />
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
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:py-8">
          <Spinner size="lg" />
          <span className="gba:text-sm">Loading previous step data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={prefixDataTestId}>
        <CardContent className="gba:py-6">
          <Alert variant="destructive">
            <AlertTitle>Error Loading Previous Data</AlertTitle>
            <AlertDescription className="gba:flex gba:flex-col gba:gap-3">
              <span>{error}</span>
              <div>
                <Button variant="outline" size="sm" onClick={() => void loadPreviousStepsData()}>
                  <ArrowsClockwiseIcon size={16} />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (stepDataMap.size === 0) {
    return (
      <Card data-testid={prefixDataTestId}>
        <CardContent className="gba:py-8 gba:text-center">
          <ClockCounterClockwiseIcon size={40} className="gba:mx-auto gba:mb-4 gba:text-muted-foreground" />
          <h3 className="gba:mb-2 gba:text-lg gba:font-semibold">No Previous Step Data</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            No completed tasks found in previous steps of this workflow.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={prefixDataTestId}>
      <CardContent className="gba:space-y-4 gba:py-6">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <ClockCounterClockwiseIcon size={18} className="gba:text-muted-foreground" />
          <h3 className="gba:text-base gba:font-semibold">Previous Step Data</h3>
          <Badge variant="info">
            {stepDataMap.size} step{stepDataMap.size !== 1 ? 's' : ''} with data
          </Badge>
        </div>

        {/* @ts-expect-error - Accordion type definition is missing children prop */}
        <Accordion type="multiple" defaultValue={expandedStepKeys} className="gba:w-full">
          {Array.from(stepDataMap.entries()).map(([stepIndex, stepData]) => (
            <AccordionItem key={stepIndex} value={`step-${stepIndex}`}>
              <AccordionTrigger className="hover:gba:no-underline">
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-left">
                  <span className="gba:font-medium">Step {stepIndex + 1}</span>
                  <Badge variant="success">{stepData.data.length} completed</Badge>
                  {stepData.totalCount > stepData.data.length && (
                    <Badge variant="warning">+{stepData.totalCount - stepData.data.length} more</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>{renderStepData(stepIndex, stepData)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

function formatFieldLabel(fieldName: string): string {
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
}

function safeJsonStringify(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent)
  } catch {
    return '[Unserializable value]'
  }
}
