import React from 'react'
import { Card, Badge, Spinner, Alert, Button } from '@newwork/nw-design-system'
import { CheckCircleIcon, FileTextIcon, CalendarIcon } from '@phosphor-icons/react'
import { FlowSummaryData } from '../hooks/useFlowSummary'
import { formatDate, formatDateTime, getUserDateFormat, getUserLocale } from '../../../config/dateTimeConfig'

export interface FlowSummaryProps {
  summaryData: FlowSummaryData | null
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  userInfo?: any
}

/**
 * FlowSummary Component
 * Displays workflow completion summary with visibility-filtered result data
 * Uses summaryFields defined in Step 0 of the workflow template
 */
export const FlowSummary: React.FC<FlowSummaryProps> = ({ summaryData, isLoading, error, onRetry, userInfo }) => {
  // Format value based on type and format
  const formatValue = (value: any, type?: string, format?: string): string => {
    try {
      if (value === null || value === undefined) {
        return '-'
      }

      // Handle different types
      switch (type) {
        case 'date':
          try {
            return formatDate(value, getUserDateFormat(userInfo), getUserLocale(userInfo))
          } catch (err) {
            console.error('[FlowSummary] Error formatting date:', err)
            return String(value)
          }

        case 'datetime':
          try {
            return formatDateTime(value)
          } catch (err) {
            console.error('[FlowSummary] Error formatting datetime:', err)
            return String(value)
          }

        case 'currency':
          try {
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (isNaN(numValue)) {
              return String(value)
            }
            if (format) {
              // Extract currency code from format (e.g., "USD", "EUR")
              const currencyCode = format.toUpperCase()
              return new Intl.NumberFormat(getUserLocale(userInfo), {
                style: 'currency',
                currency: currencyCode
              }).format(numValue)
            }
            return new Intl.NumberFormat(getUserLocale(userInfo), {
              style: 'currency',
              currency: 'USD'
            }).format(numValue)
          } catch (err) {
            console.error('[FlowSummary] Error formatting currency:', err)
            return String(value)
          }

        case 'number':
          try {
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (isNaN(numValue)) {
              return String(value)
            }
            if (format === 'percentage') {
              return `${numValue.toFixed(2)}%`
            }
            return new Intl.NumberFormat(getUserLocale(userInfo)).format(numValue)
          } catch (err) {
            console.error('[FlowSummary] Error formatting number:', err)
            return String(value)
          }

        case 'boolean':
          return value ? 'Yes' : 'No'

        case 'array':
          if (Array.isArray(value)) {
            return value.map(v => String(v)).join(', ')
          }
          return String(value)

        default:
          // Handle objects and arrays
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              return value.map(v => String(v)).join(', ')
            }
            try {
              const jsonStr = JSON.stringify(value, null, 2)
              // Limit length for display
              if (jsonStr.length > 500) {
                return jsonStr.substring(0, 500) + '...'
              }
              return jsonStr
            } catch (err) {
              console.error('[FlowSummary] Error stringifying object:', err)
              return '[Complex Object]'
            }
          }
          return String(value)
      }
    } catch (error) {
      console.error('[FlowSummary] Error in formatValue:', error, { value, type, format })
      return '[Error formatting value]'
    }
  }

  // Get badge color based on field type or value
  const getFieldBadgeColor = (type?: string) => {
    switch (type) {
      case 'currency':
        return 'gba:bg-success-secondary gba:text-success-secondary-foreground'
      case 'date':
      case 'datetime':
        return 'gba:bg-info-secondary gba:text-info-secondary-foreground'
      case 'boolean':
        return 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
      default:
        return 'gba:bg-muted gba:text-muted-foreground'
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="gba:p-6" data-testid="flow-summary-loading">
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-center">
            <Spinner size="lg" className="gba:mb-4" />
            <p className="gba:text-sm gba:text-muted-foreground">Loading workflow summary...</p>
          </div>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="gba:p-6" data-testid="flow-summary-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold gba:mb-2">Failed to Load Summary</h4>
          <p className="gba:text-sm gba:mb-4">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </Alert>
      </Card>
    )
  }

  // No summary data available
  if (!summaryData || !summaryData.summaryData || summaryData.summaryData.length === 0) {
    console.log('[FlowSummary] No summary data to display:', { summaryData })
    return null // Don't show anything if there's no summary data
  }

  // Log the summary data for debugging
  try {
    console.log('[FlowSummary] Rendering summary data:', {
      workflowId: summaryData.workflowId,
      workflowName: summaryData.workflowName,
      status: summaryData.status,
      fieldsCount: summaryData.summaryData?.length || 0,
      fields: Array.isArray(summaryData.summaryData)
        ? summaryData.summaryData.map(f => ({ label: f?.label, type: f?.type, hasValue: f?.value !== undefined }))
        : []
    })
  } catch (err) {
    console.error('[FlowSummary] Error logging summary data:', err)
  }

  return (
    <Card
      className="gba:p-6 gba:border-2 gba:border-success-secondary gba:bg-gradient-to-r gba:from-success-secondary gba:to-background"
      data-testid="flow-summary-card"
    >
      {/* Header */}
      <div className="gba:flex gba:items-start gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-success gba:text-success-foreground">
            <CheckCircleIcon size={24} weight="fill" />
          </div>
          <div>
            <h5 className="gba:text-lg gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
              Request Completed Successfully
            </h5>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Here&apos;s a summary of the results</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="gba:bg-success-secondary gba:text-success-secondary-foreground gba:border-success"
        >
          <CheckCircleIcon size={14} className="gba:mr-1" />
          Completed
        </Badge>
      </div>

      {/* Request Metadata */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:mb-6 gba:p-4 gba:bg-background gba:rounded-lg gba:border">
        <div className="gba:flex gba:flex-col">
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Request</span>
          <span className="gba:text-sm gba:font-semibold gba:text-foreground">
            {summaryData.workflowName || summaryData.workflowId || 'N/A'}
          </span>
        </div>

        {summaryData.completedAt && (
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1 gba:flex gba:items-center gba:gap-1">
              <CalendarIcon size={14} />
              Completed On
            </span>
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">
              {formatDateTime(summaryData.completedAt)}
            </span>
          </div>
        )}

        {summaryData.progress !== undefined &&
          (() => {
            // Handle progress as either a number or an object
            const progressValue =
              typeof summaryData.progress === 'object' && summaryData.progress !== null
                ? (summaryData.progress as any).percentage || 100
                : summaryData.progress

            return (
              <div className="gba:flex gba:flex-col">
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Progress</span>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:flex-1 gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                    <div
                      className="gba:h-full gba:bg-success gba:transition-all gba:duration-300"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">{progressValue}%</span>
                </div>
              </div>
            )
          })()}
      </div>

      {/* Summary Data Fields */}
      <div>
        <h6 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <FileTextIcon size={16} />
          Result Summary
          <Badge variant="outline" className="gba:text-xs gba:ml-2">
            {summaryData.summaryData.length} {summaryData.summaryData.length === 1 ? 'field' : 'fields'}
          </Badge>
        </h6>

        <div className="gba:space-y-3">
          {Array.isArray(summaryData.summaryData) &&
            summaryData.summaryData.map((field, index) => (
              <div
                key={`summary-field-${index}-${field?.label || 'unknown'}`}
                className="gba:p-4 gba:bg-background gba:rounded-lg gba:border gba:hover:border-primary gba:transition-colors"
                data-testid={`summary-field-${index}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <span className="gba:text-sm gba:font-medium gba:text-foreground">
                        {field?.label || 'Unnamed Field'}
                      </span>
                      {field?.type && (
                        <Badge variant="outline" className={`gba:text-xs ${getFieldBadgeColor(field?.type)}`}>
                          {field?.type}
                        </Badge>
                      )}
                    </div>
                    <div className="gba:text-base gba:font-semibold gba:text-foreground gba:break-words">
                      {(() => {
                        try {
                          return formatValue(field?.value, field?.type, field?.format)
                        } catch (err) {
                          console.error('[FlowSummary] Error rendering field value:', err, { field })
                          return '[Error displaying value]'
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-muted">
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          This summary shows the results configured in the request template. Only fields visible to you are displayed.
        </p>
      </div>
    </Card>
  )
}
