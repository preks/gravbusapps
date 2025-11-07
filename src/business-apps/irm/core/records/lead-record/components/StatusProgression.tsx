import React from 'react'
import { ReferenceData } from '../types'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface StatusProgressionProps {
  currentStatus: string
  statuses: ReferenceData[]
  leadId: string
  leadVersion: number
  accessToken: string
  onStatusUpdate?: () => void
}

export const StatusProgression: React.FC<StatusProgressionProps> = ({
  currentStatus,
  statuses,
  leadId,
  leadVersion,
  accessToken
}) => {
  const getCurrentStatusIndex = () => {
    const currentIndex = statuses.findIndex(
      status =>
        status.value.toLowerCase() === currentStatus.toLowerCase() ||
        status.code.toLowerCase() === currentStatus.toLowerCase()
    )
    return currentIndex >= 0 ? currentIndex : 0
  }

  const currentIndex = getCurrentStatusIndex()

  if (statuses.length === 0) {
    return null
  }

  // Find the indices for key statuses
  const openIndex = statuses.findIndex(s => s.value.toLowerCase() === 'open')
  const convertedIndex = statuses.findIndex(s => s.value.toLowerCase() === 'converted')
  const lostIndex = statuses.findIndex(s => s.value.toLowerCase() === 'lost')

  // Determine current status
  const isOpen = currentIndex === openIndex
  const isConverted = currentIndex === convertedIndex
  const isLost = currentIndex === lostIndex

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        className="gba:bg-muted gba:border gba:border-muted"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          borderRadius: '24px',
          overflow: 'visible',
          padding: '0 4px'
        }}
      >
        {/* OPEN Status - Always shown on the left */}
        {openIndex !== -1 &&
          (isOpen ? (
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
                backgroundColor: 'hsl(var(--success))',
                color: 'hsl(var(--success-foreground))',
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
                className="gba:bg-primary-foreground/30"
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
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
          ) : (
            <AppAction
              contextsArray={[FlowContextName.investmentSaveLead]}
              externalContextData={{
                leadId,
                leadVersion,
                newStatusRef: `InvestmentLeadStatus:v1:${statuses[openIndex].code}`,
                statusDisplayName: statuses[openIndex].value
              }}
              prefixDataTestId="investment-lead-status-open"
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
                  color: 'var(--color-muted-foreground)',
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
          ))}

        {/* RIGHT SIDE - Conditional based on current status */}
        {isOpen ? (
          /* If Open: Show both Converted and Lost (not colored) */
          <div
            className="gba:bg-muted gba:border gba:border-muted"
            style={{
              position: 'relative',
              height: '40px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '0 20px 20px 0',
              marginRight: '0',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
              WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
            }}
            data-testid="status-converted-lost-combined"
          >
            {/* CONVERTED Section */}
            {convertedIndex !== -1 && (
              <div style={{ flex: 1, display: 'flex' }}>
                <AppAction
                  contextsArray={[FlowContextName.investmentSaveLead]}
                  externalContextData={{
                    leadId,
                    leadVersion,
                    newStatusRef: `InvestmentLeadStatus:v1:${statuses[convertedIndex].code}`,
                    statusDisplayName: statuses[convertedIndex].value
                  }}
                  prefixDataTestId="investment-lead-status-converted"
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
                      color: 'var(--color-muted-foreground)',
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
                      <span style={{ fontSize: '13px' }}>Converted</span>
                    </div>
                  </div>
                </AppAction>
              </div>
            )}

            {/* Divider */}
            <div
              className="gba:bg-border"
              style={{
                width: '1px',
                height: '24px'
              }}
            />

            {/* LOST Section */}
            {lostIndex !== -1 && (
              <div style={{ flex: 1, display: 'flex' }}>
                <AppAction
                  contextsArray={[FlowContextName.investmentSaveLead]}
                  externalContextData={{
                    leadId,
                    leadVersion,
                    newStatusRef: `InvestmentLeadStatus:v1:${statuses[lostIndex].code}`,
                    statusDisplayName: statuses[lostIndex].value
                  }}
                  prefixDataTestId="investment-lead-status-lost"
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
                      color: 'var(--color-muted-foreground)',
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
                      <span style={{ fontSize: '13px' }}>Lost</span>
                    </div>
                  </div>
                </AppAction>
              </div>
            )}
          </div>
        ) : (
          /* If Converted or Lost: Show only the active one (colored) */
          (isConverted || isLost) &&
          openIndex !== -1 && (
            <AppAction
              contextsArray={[FlowContextName.investmentSaveLead]}
              externalContextData={{
                leadId,
                leadVersion,
                newStatusRef: `InvestmentLeadStatus:v1:${statuses[openIndex].code}`,
                statusDisplayName: statuses[openIndex].value
              }}
              prefixDataTestId="investment-lead-status-reopen"
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
                  backgroundColor: isConverted ? '#4CAF50' : isLost ? '#f44336' : 'transparent',
                  color: isConverted || isLost ? 'white' : '#666666',
                  borderRadius: '0 20px 20px 0',
                  marginRight: '0',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
                  WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
                }}
                data-testid={isConverted ? 'status-converted' : 'status-lost'}
              >
                {/* When clicking on an active status, allow changing back to Open */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 16px'
                  }}
                >
                  {(isConverted || isLost) && (
                    <span
                      className="gba:bg-primary-foreground/30"
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
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
        )}
      </div>
    </div>
  )
}
