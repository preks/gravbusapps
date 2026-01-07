import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ReferenceData {
  code: string
  value: string
}

export interface StatusProgressionConfig {
  flowContextName: FlowContextName
  statusReferencePrefix: string
  testIdPrefix: string
  terminalStatusPadding?: string
}

export interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
  config: StatusProgressionConfig
}

export interface StatusIndices {
  openIndex: number
  convertedIndex: number
  lostIndex: number
  currentIndex: number
  isOpen: boolean
  isConverted: boolean
  isLost: boolean
}

// Constants for styling
const DEFAULT_TERMINAL_STATUS_PADDING = '0 12px 0 26px'

const renderActiveOpenStatus = (statuses: ReferenceData[], openIndex: number) => (
  <div
    className="gba:bg-success gba:text-success-foreground"
    style={{
      position: 'relative',
      height: '40px',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '20px 0 0 20px',
      marginRight: '140px',
      transition: 'all 0.3s ease',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
      WebkitClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
      cursor: 'default'
    }}
    data-testid="status-open"
  >
    <span
      style={{
        fontSize: '14px',
        fontWeight: 'bold',
        backgroundColor: 'hsl(var(--success-foreground) / 0.3)',
        color: 'hsl(var(--success-foreground))',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '8px'
      }}
    >
      ✓
    </span>
    <span style={{ whiteSpace: 'nowrap' }}>{statuses[openIndex].value}</span>
  </div>
)

const renderInactiveOpenStatus = (
  leadId: string,
  leadVersion: number,
  statuses: ReferenceData[],
  openIndex: number,
  accessToken: string,
  config: StatusProgressionConfig
) => {
  return (
    <AppAction
      contextsArray={[config.flowContextName]}
      externalContextData={{
        leadId,
        leadVersion,
        newStatusRef: `${config.statusReferencePrefix}${statuses[openIndex].code}`,
        statusDisplayName: statuses[openIndex].value
      }}
      prefixDataTestId={`${config.testIdPrefix}-open`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      className="gba:flex gba:flex-1"
    >
      <button
        type="button"
        className="gba:bg-transparent gba:text-muted-foreground gba:border-0 gba:w-full"
        style={{
          position: 'relative',
          height: '40px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '20px 0 0 20px',
          marginRight: '100px',
          transition: 'all 0.3s ease',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
          WebkitClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
          cursor: 'pointer'
        }}
        aria-label={`Change status to ${statuses[openIndex].value}`}
        data-testid="status-open"
      >
        <span style={{ whiteSpace: 'nowrap' }}>{statuses[openIndex].value}</span>
      </button>
    </AppAction>
  )
}

const renderConvertedLostSection = (
  leadId: string,
  leadVersion: number,
  statuses: ReferenceData[],
  convertedIndex: number,
  lostIndex: number,
  accessToken: string,
  config: StatusProgressionConfig
) => {
  const padding = config.terminalStatusPadding || DEFAULT_TERMINAL_STATUS_PADDING

  return (
    <div
      style={{
        position: 'relative',
        height: '40px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'hsl(var(--muted))',
        borderRadius: '0 20px 20px 0',
        marginRight: '0',
        transition: 'all 0.3s ease',
        border: '1px solid hsl(var(--border))',
        overflow: 'hidden',
        clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 26px 50%)',
        WebkitClipPath: 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 26px 50%)'
      }}
      data-testid="status-converted-lost-combined"
    >
      {convertedIndex !== -1 && (
        <div style={{ flex: 1, display: 'flex' }}>
          <AppAction
            contextsArray={[config.flowContextName]}
            externalContextData={{
              leadId,
              leadVersion,
              newStatusRef: `${config.statusReferencePrefix}${statuses[convertedIndex].code}`,
              statusDisplayName: statuses[convertedIndex].value
            }}
            prefixDataTestId={`${config.testIdPrefix}-converted`}
            accessToken={accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <button
              type="button"
              className="gba:bg-transparent gba:border-0 gba:w-full"
              style={{
                position: 'relative',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              aria-label={`Change status to ${
                statuses[convertedIndex]?.value ||
                getTranslationFromI18nKeyAndLabel('common.status.converted', 'Converted')
              }`}
              data-testid="status-converted"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding
                }}
              >
                <span style={{ fontSize: '13px' }}>
                  {statuses[convertedIndex]?.value ||
                    getTranslationFromI18nKeyAndLabel('common.status.converted', 'Converted')}
                </span>
              </div>
            </button>
          </AppAction>
        </div>
      )}
      <div style={{ width: '1px', height: '24px', backgroundColor: 'hsl(var(--border))' }} />
      {lostIndex !== -1 && (
        <div style={{ flex: 1, display: 'flex' }}>
          <AppAction
            contextsArray={[config.flowContextName]}
            externalContextData={{
              leadId,
              leadVersion,
              newStatusRef: `${config.statusReferencePrefix}${statuses[lostIndex].code}`,
              statusDisplayName: statuses[lostIndex].value
            }}
            prefixDataTestId={`${config.testIdPrefix}-lost`}
            accessToken={accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <button
              type="button"
              className="gba:bg-transparent gba:border-0 gba:w-full"
              style={{
                position: 'relative',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              aria-label={`Change status to ${
                statuses[lostIndex]?.value || getTranslationFromI18nKeyAndLabel('common.status.lost', 'Lost')
              }`}
              data-testid="status-lost"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding
                }}
              >
                <span style={{ fontSize: '13px' }}>
                  {statuses[lostIndex]?.value || getTranslationFromI18nKeyAndLabel('common.status.lost', 'Lost')}
                </span>
              </div>
            </button>
          </AppAction>
        </div>
      )}
    </div>
  )
}

const renderActiveStatusBadge = (
  leadId: string,
  leadVersion: number,
  statuses: ReferenceData[],
  indices: StatusIndices,
  accessToken: string,
  config: StatusProgressionConfig
) => {
  const { isConverted, isLost, openIndex, convertedIndex, lostIndex } = indices

  const getColorClasses = () => {
    if (isConverted) return 'gba:bg-success gba:text-success-foreground'
    if (isLost) return 'gba:bg-destructive gba:text-destructive-foreground'
    return 'gba:bg-transparent gba:text-muted-foreground'
  }

  const currentStatusValue = isConverted ? statuses[convertedIndex].value : statuses[lostIndex].value

  return (
    <AppAction
      contextsArray={[config.flowContextName]}
      externalContextData={{
        leadId,
        leadVersion,
        newStatusRef: `${config.statusReferencePrefix}${statuses[openIndex].code}`,
        statusDisplayName: statuses[openIndex].value
      }}
      prefixDataTestId={`${config.testIdPrefix}-reopen`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      className="gba:flex gba:flex-1"
    >
      <button
        type="button"
        className={`${getColorClasses()} gba:border-0 gba:w-full`}
        style={{
          position: 'relative',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '0 20px 20px 0',
          marginRight: '0',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 26px 50%)',
          WebkitClipPath: 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 26px 50%)'
        }}
        aria-label={`Revert status to ${statuses[openIndex].value}`}
        data-testid={isConverted ? 'status-converted' : 'status-lost'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
          {(isConverted || isLost) && (
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: isConverted
                  ? 'hsl(var(--success-foreground) / 0.3)'
                  : 'hsl(var(--destructive-foreground) / 0.3)',
                color: isConverted ? 'hsl(var(--success-foreground))' : 'hsl(var(--destructive-foreground))',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✓
            </span>
          )}
          <span style={{ whiteSpace: 'nowrap' }}>{currentStatusValue}</span>
        </div>
      </button>
    </AppAction>
  )
}

export const StatusProgression: React.FC<StatusProgressionProps> = ({
  currentStatus,
  statuses,
  leadId,
  leadVersion,
  accessToken,
  config
}) => {
  const getCurrentStatusIndex = () => {
    const currentIndex = statuses.findIndex(
      status =>
        status.value.toLowerCase() === currentStatus.toLowerCase() ||
        status.code.toLowerCase() === currentStatus.toLowerCase()
    )
    return Math.max(currentIndex, 0)
  }

  const currentIndex = getCurrentStatusIndex()

  if (statuses.length === 0) {
    return null
  }

  // Use status codes for matching instead of display values to support internationalization
  const openIndex = statuses.findIndex(s => s.code.toLowerCase() === 'open')
  const convertedIndex = statuses.findIndex(s => s.code.toLowerCase() === 'converted')
  const lostIndex = statuses.findIndex(s => s.code.toLowerCase() === 'lost')

  const isOpen = currentIndex === openIndex
  const isConverted = currentIndex === convertedIndex
  const isLost = currentIndex === lostIndex

  const indices: StatusIndices = {
    openIndex,
    convertedIndex,
    lostIndex,
    currentIndex,
    isOpen,
    isConverted,
    isLost
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          borderRadius: '24px',
          overflow: 'visible',
          border: '1px solid hsl(var(--border))',
          padding: '0 4px'
        }}
        className="gba:bg-muted"
      >
        {openIndex !== -1 &&
          (isOpen
            ? renderActiveOpenStatus(statuses, openIndex)
            : renderInactiveOpenStatus(leadId, leadVersion, statuses, openIndex, accessToken, config))}

        {isOpen
          ? renderConvertedLostSection(leadId, leadVersion, statuses, convertedIndex, lostIndex, accessToken, config)
          : (isConverted || isLost) &&
            openIndex !== -1 &&
            renderActiveStatusBadge(leadId, leadVersion, statuses, indices, accessToken, config)}
      </div>
    </div>
  )
}
