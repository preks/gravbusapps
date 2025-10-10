import React from 'react'
import { Button } from 'antd'
import { TagsOutlined, StarOutlined, UserOutlined } from '@ant-design/icons'
import { Badge, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@newwork/nw-design-system'
import { Flag } from 'lucide-react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useMarkLeadAsLost } from '../hooks/useMarkLeadAsLost'
import { Lead } from '../types'

interface LeadHeaderProps {
  lead: Lead
  leadData: any
  leadId: string
  additionalData?: any
  accessToken: string
  onStatusUpdate?: () => void
}

export const LeadHeader: React.FC<LeadHeaderProps> = ({
  lead,
  leadData,
  leadId,
  additionalData,
  accessToken,
  onStatusUpdate
}) => {
  return (
    <div
      className="gba:lead-header"
      style={{
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {lead.name}
              {(leadData?.sensitive === true || lead.sensitive === true) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="warning"
                        className="gba:ml-2 gba:rounded-full gba:p-1 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center"
                      >
                        <Flag className="gba:h-3 gba:w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Sensitive</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Lead-specific fields */}
            <div
              style={{
                color: '#8c8c8c',
                fontSize: '14px',
                marginBottom: '8px'
              }}
            >
              <TagsOutlined style={{ marginRight: '4px' }} />
              <span>Source: {leadData?.leadSource?.value || 'Unknown'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <StarOutlined style={{ marginRight: '4px' }} />
              <span>Rating: {leadData?.leadRating?.value || 'Unknown'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>
                Owner:{' '}
                {leadData?.ownerEmployee
                  ? `${leadData.ownerEmployee.firstName} ${leadData.ownerEmployee.lastName}`
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="lead-record-action-button"
              size="default"
              contextsArray={[FlowContextName.customerLeadEntity]}
              externalContextData={{
                leadId: leadId
              }}
              prefixDataTestId="lead-record-action"
              accessToken={accessToken}
              emptyStateBehavior="hide"
              deferMainContextRequestsUntilClick={false}
            >
              Actions
            </AppActionButton>
          )}
        </div>
      </div>
    </div>
  )
}
