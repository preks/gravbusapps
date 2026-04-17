import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getSegmentStyling } from './utils/getSegmentStyling'
import { cn } from '@/common/utils/cn'

export interface ReferenceData {
  id?: string
  code: string
  value: string
}

export interface StatusProgressionConfig {
  flowContextName: FlowContextName
  statusReferencePrefix: string
  testIdPrefix: string
  /** Optional: status codes that get success styling when current (e.g. ['CONVERTED']) */
  successStatusCodes?: string[]
  /** Optional: status codes that get destructive styling when current (e.g. ['LOST']) */
  destructiveStatusCodes?: string[]
}

export interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
  config: StatusProgressionConfig
}

const getCurrentStatusColorClasses = (statusCode: string, config: StatusProgressionConfig): string => {
  const code = statusCode.toLowerCase()
  const successCodes = (config.successStatusCodes ?? []).map(c => c.toLowerCase())
  const destructiveCodes = (config.destructiveStatusCodes ?? []).map(c => c.toLowerCase())

  if (successCodes.includes(code)) return 'gba:bg-success gba:text-success-foreground'
  if (destructiveCodes.includes(code)) return 'gba:bg-destructive gba:text-destructive-foreground'
  return 'gba:bg-success gba:text-success-foreground'
}

const getCheckmarkClasses = (statusCode: string, config: StatusProgressionConfig): string => {
  const code = statusCode.toLowerCase()
  const destructiveCodes = (config.destructiveStatusCodes ?? []).map(c => c.toLowerCase())
  if (destructiveCodes.includes(code)) {
    return 'gba:bg-destructive-foreground/30 gba:text-destructive-foreground'
  }
  return 'gba:bg-success-foreground/30 gba:text-success-foreground'
}

export const StatusProgression: React.FC<StatusProgressionProps> = ({
  currentStatus,
  statuses,
  leadId,
  leadVersion,
  accessToken,
  config
}) => {
  const currentIndex = statuses.findIndex(
    status =>
      status.value.toLowerCase() === currentStatus.toLowerCase() ||
      status.code.toLowerCase() === currentStatus.toLowerCase()
  )
  const resolvedCurrentIndex = currentIndex >= 0 ? currentIndex : 0

  if (statuses.length === 0) {
    return null
  }

  return (
    <div className="gba:mb-6">
      <div
        className={cn(
          'gba:flex gba:items-center gba:h-12 gba:bg-muted gba:rounded-3xl gba:overflow-x-auto gba:overflow-y-hidden gba:min-w-0',
          'gba:border gba:border-border gba:p-1 gba:gap-0'
        )}
      >
        {statuses.map((status, index) => {
          const isCurrent = index === resolvedCurrentIndex
          const { borderRadius, clipPath, WebkitClipPath, marginRight } = getSegmentStyling(index, statuses.length)
          const colorClasses = isCurrent
            ? getCurrentStatusColorClasses(status.code, config)
            : 'gba:bg-transparent gba:text-muted-foreground'
          const segmentStyle = {
            borderRadius,
            clipPath,
            WebkitClipPath,
            marginRight,
            position: 'relative' as const,
            height: '40px',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            minWidth: '80px'
          }
          const dataTestId = `${config.testIdPrefix}-${status.code.toLowerCase()}`
          const newStatusRef = `${config.statusReferencePrefix}${status.code}`

          if (isCurrent) {
            return (
              <div
                key={status.id ?? status.code}
                className={cn(colorClasses, 'gba:cursor-default')}
                style={segmentStyle}
                data-testid={dataTestId}
                aria-label={status.value}
              >
                <span className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:whitespace-nowrap">
                  <span
                    className={cn(
                      'gba:flex gba:items-center gba:justify-center gba:rounded-full gba:w-5 gba:h-5 gba:font-bold',
                      getCheckmarkClasses(status.code, config)
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {status.value}
                </span>
              </div>
            )
          }

          return (
            <AppAction
              key={status.id ?? status.code}
              contextsArray={[config.flowContextName]}
              externalContextData={{
                leadId,
                leadVersion,
                newStatusRef,
                statusDisplayName: status.value
              }}
              prefixDataTestId={config.testIdPrefix}
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              className="gba:flex gba:flex-1"
            >
              <button
                type="button"
                className={cn(colorClasses, 'gba:bg-transparent gba:border-0 gba:w-full gba:cursor-pointer')}
                style={segmentStyle}
                aria-label={`Change status to ${status.value}`}
                data-testid={dataTestId}
              >
                <span className="gba:whitespace-nowrap gba:px-4">{status.value}</span>
              </button>
            </AppAction>
          )
        })}
      </div>
    </div>
  )
}
