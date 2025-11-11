import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ReferenceData {
  code: string
  value: string
}

export interface StatusProgressionConfig {
  flowContextName: FlowContextName
  statusReferencePrefix: string
  testIdPrefix: string
}

export interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
  config: StatusProgressionConfig
}

interface StatusIndices {
  openIndex: number
  convertedIndex: number
  lostIndex: number
  currentIndex: number
  isOpen: boolean
  isConverted: boolean
  isLost: boolean
}

const renderActiveOpenStatus = (statuses: ReferenceData[], openIndex: number) => (
  <div
    style={{
      position: 'relative',
      height: '40px',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      // eslint-disable-next-line newwork-local/no-hardcoded-colors
      backgroundColor: '#4CAF50',
      // eslint-disable-next-line newwork-local/no-hardcoded-colors
      color: 'white',
      borderRadius: '20px 0 0 20px',
      marginRight: '8px',
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
        // eslint-disable-next-line newwork-local/no-hardcoded-colors
        backgroundColor: 'rgba(255,255,255,0.3)',
        // eslint-disable-next-line newwork-local/no-hardcoded-colors
        color: 'white',
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
) => (
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
    style={{ flex: 1, display: 'flex' }}
  >
    <div
      style={{
        position: 'relative',
        height: '40px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '600',
        backgroundColor: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        borderRadius: '20px 0 0 20px',
        marginRight: '8px',
        transition: 'all 0.3s ease',
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
        WebkitClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
        cursor: 'pointer'
      }}
      data-testid="status-open"
    >
      <span style={{ whiteSpace: 'nowrap' }}>{statuses[openIndex].value}</span>
    </div>
  </AppAction>
)

const renderConvertedLostSection = (
  leadId: string,
  leadVersion: number,
  statuses: ReferenceData[],
  convertedIndex: number,
  lostIndex: number,
  accessToken: string,
  config: StatusProgressionConfig
) => (
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
      clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
      WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
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
          <div
            style={{
              position: 'relative',
              height: '38px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: 'transparent',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            data-testid="status-converted"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px 0 160px'
              }}
            >
              <span style={{ fontSize: '13px' }}>{statuses[convertedIndex]?.value || 'Converted'}</span>
            </div>
          </div>
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
          <div
            style={{
              position: 'relative',
              height: '38px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: 'transparent',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            data-testid="status-lost"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px 0 160px'
              }}
            >
              <span style={{ fontSize: '13px' }}>{statuses[lostIndex]?.value || 'Lost'}</span>
            </div>
          </div>
        </AppAction>
      </div>
    )}
  </div>
)

const renderActiveStatusBadge = (
  leadId: string,
  leadVersion: number,
  statuses: ReferenceData[],
  indices: StatusIndices,
  accessToken: string,
  config: StatusProgressionConfig
) => {
  const { isConverted, isLost, openIndex, convertedIndex, lostIndex } = indices

  const getBackgroundColor = () => {
    if (isConverted) return '#4CAF50'
    if (isLost) return '#f44336'
    return 'transparent'
  }

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
      style={{ flex: 1, display: 'flex' }}
    >
      <div
        style={{
          position: 'relative',
          height: '40px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '600',
          backgroundColor: getBackgroundColor(),
          color: isConverted || isLost ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
          borderRadius: '0 20px 20px 0',
          marginRight: '0',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
          WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
        }}
        data-testid={isConverted ? 'status-converted' : 'status-lost'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
          {(isConverted || isLost) && (
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                // eslint-disable-next-line newwork-local/no-hardcoded-colors
                backgroundColor: 'rgba(255,255,255,0.3)',
                // eslint-disable-next-line newwork-local/no-hardcoded-colors
                color: 'white',
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
          <span style={{ whiteSpace: 'nowrap' }}>
            {isConverted ? statuses[convertedIndex].value : statuses[lostIndex].value}
          </span>
        </div>
      </div>
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

  const openIndex = statuses.findIndex(s => s.value.toLowerCase() === 'open')
  const convertedIndex = statuses.findIndex(s => s.value.toLowerCase() === 'converted')
  const lostIndex = statuses.findIndex(s => s.value.toLowerCase() === 'lost')

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
