/**
 * CrmEntityRow – Renders a single CRM entity suggestion with avatar, name,
 * type badge, and a one-click "Record" button that creates the activity
 * immediately (no form) via AppActionProvider with skipScreen.
 */

import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Spinner
} from '@newwork/nw-design-system'
import { BuildingsIcon, UserIcon, BriefcaseIcon, TargetIcon, CheckIcon } from '@phosphor-icons/react'
import { AppActionProvider } from '@/components/app-action-provider/AppActionProvider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { env } from '@/common/env/EnvUtils'
import { EmailApiService } from '../services/EmailApiService'
import type { CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'
import type { EmailMessage } from '../types'

/* ---------- Constants ---------- */

const EMAIL_ACTIVITY_TYPE_REF = 'SalesActivityType:v1:EMAIL'

const ENTITY_ICONS: Record<string, React.FC<any>> = {
  account: BuildingsIcon,
  contact: UserIcon,
  opportunity: BriefcaseIcon,
  lead: TargetIcon
}

const ENTITY_LABELS: Record<string, string> = {
  account: 'Account',
  contact: 'Contact',
  opportunity: 'Opportunity',
  lead: 'Lead'
}

/* ---------- Helpers ---------- */

/** Build the full activity payload for one-click creation */
export const buildActivityPayload = (
  entity: CrmEntityMatch,
  message: EmailMessage,
  description?: string
): Record<string, any> => {
  const entityIdKey = `${entity.type}Id`

  return {
    salesActivity: {
      title: message.subject || '(No subject)',
      description: description || message.textBody || message.snippet || '',
      occurredAt: message.date || new Date().toISOString(),
      activityTypeRef: EMAIL_ACTIVITY_TYPE_REF,
      source: 'email',
      [entity.type]: entity.id,
      additionalProperties: {
        emailMessageId: message.id
      }
    },
    [entityIdKey]: entity.id,
    [entity.type]: entity.id
  }
}

/** Link email to CRM entity in document-service (fire-and-forget) */
const linkEmailToCrm = (messageId: string, entityType: string, entityId: string, accessToken: string) => {
  const publicUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_URL')
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  const apiUrl = publicUrl || (baseUrl ? `${baseUrl.replace(/\/$/, '')}/document/api/v1` : null)
  if (!apiUrl) return

  fetch(`${apiUrl}/emails/messages/${messageId}/crm-link`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      crmEntityType: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      crmEntityId: entityId
    })
  }).catch(err => console.error('Email CRM link failed:', err))
}

const getInitials = (name: string): string =>
  (name || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/* ---------- Component ---------- */

interface CrmEntityRowProps {
  entity: CrmEntityMatch
  message: EmailMessage
  accessToken: string
  /** Pre-fetched AI summary from parent (may be null if still loading) */
  aiSummary?: string | null
  'data-testid'?: string
}

export const CrmEntityRow: React.FC<CrmEntityRowProps> = ({
  entity,
  message,
  accessToken,
  aiSummary,
  'data-testid': testId = 'crm-entity-row'
}) => {
  const Icon = ENTITY_ICONS[entity.type] || UserIcon
  const initials = getInitials(entity.name)
  const [recorded, setRecorded] = useState(false)
  const [summarizing, setSummarizing] = useState(false)

  const handleSuccess = useCallback(() => {
    setRecorded(true)
    linkEmailToCrm(message.id, entity.type, entity.id, accessToken)
    toast.success(`Activity recorded for ${entity.name}`, {
      description: message.subject || '(No subject)'
    })
  }, [entity, message, accessToken])

  const handleError = useCallback(
    (error: Error) => {
      setSummarizing(false)
      console.error('Failed to record activity:', error)
      toast.error(`Failed to record activity for ${entity.name}`)
    },
    [entity.name]
  )

  /**
   * Click handler: if we already have the AI summary, use it immediately.
   * Otherwise fetch it on-demand, then execute the action.
   */
  const handleRecord = useCallback(
    async (execute: (data: Record<string, any>) => void) => {
      if (recorded) return

      let description = aiSummary || null

      // If no pre-fetched summary, fetch on-demand
      if (!description) {
        setSummarizing(true)
        try {
          EmailApiService.setAccessToken(accessToken)
          description = await EmailApiService.summarizeMessage(message.id)
        } catch {
          // Fallback to raw text
          description = null
        }
        setSummarizing(false)
      }

      const payload = buildActivityPayload(entity, message, description || undefined)
      execute(payload)
    },
    [recorded, aiSummary, accessToken, message, entity]
  )

  // Initial context data for AppActionProvider (used as fallback)
  const initialContextData = buildActivityPayload(entity, message, aiSummary || undefined)

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2.5 gba:px-2 gba:py-1.5 gba:rounded gba:bg-muted/30"
      data-testid={`${testId}-${entity.id}`}
    >
      {/* Avatar with logo or icon fallback */}
      <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0">
        {entity.pictureThumbnail ? (
          <AvatarImage src={`data:image/jpeg;base64,${entity.pictureThumbnail}`} alt={entity.name} />
        ) : (
          <AvatarFallback className="gba:text-xs">
            {entity.type === 'account' || entity.type === 'opportunity' ? (
              <Icon className="gba:w-3.5 gba:h-3.5" />
            ) : (
              initials
            )}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Name + subtitle */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{entity.name}</p>
          <Badge className="gba:text-[10px] gba:flex-shrink-0">{ENTITY_LABELS[entity.type]}</Badge>
        </div>
        {entity.email && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{entity.email}</p>}
      </div>

      {/* Record button via AppActionProvider (skipScreen = process runs headless) */}
      <AppActionProvider
        accessToken={accessToken}
        contextsArray={[FlowContextName.customerActivityCreate]}
        externalContextData={initialContextData}
        onSuccess={handleSuccess}
        onError={handleError}
      >
        {ctx => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={recorded ? 'ghost' : 'default'}
                  size="sm"
                  onClick={() => {
                    if (!recorded && !ctx.isProcessing && !summarizing) {
                      handleRecord(ctx.executeAction)
                    }
                  }}
                  disabled={ctx.isProcessing || recorded || ctx.isLoading || summarizing}
                  data-testid={`${testId}-book-${entity.id}`}
                >
                  {summarizing ? (
                    <Spinner size="sm" />
                  ) : ctx.isProcessing ? (
                    <Spinner size="sm" />
                  ) : recorded ? (
                    <>
                      <CheckIcon className="gba:w-3.5 gba:h-3.5 gba:mr-1" weight="bold" />
                      Recorded
                    </>
                  ) : ctx.isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    'Record'
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {summarizing
                  ? 'Summarizing email with AI...'
                  : recorded
                    ? 'Activity recorded'
                    : `Record email as activity for ${entity.name}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </AppActionProvider>
    </div>
  )
}

export default CrmEntityRow
