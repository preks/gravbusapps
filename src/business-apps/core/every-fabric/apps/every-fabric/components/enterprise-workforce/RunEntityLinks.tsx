// Domain-agnostic "what records did the agent touch" section for the run
// detail drawer. Generalises the original CRM-only view: it renders a
// "Case assigned" banner for the run's primary entity (case_ref) plus one row
// per recognised domain action. CRM accounts/contacts get a deep-link into the
// CRM record pages; other domains fall back to plain id chips.

import { ArrowSquareOutIcon, BriefcaseIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import React from 'react'

import { buildEntityNavigationUrl } from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityNavigation'
import type { WorkforceRunCaseRef, WorkforceRunDomainAction } from './workforceTypes'
import { formatTimestamp } from './runDisplay'
import { FlowActionDetails } from './FlowActionDetails'

export interface RunEntityLinksProps {
  actions: readonly WorkforceRunDomainAction[]
  caseRef?: WorkforceRunCaseRef | null
  // Needed to poll live workflow status for flow rows. When absent, flow
  // rows still render with their last-known (agent-reported) state.
  accessToken?: string
  // When set, flow rows open the Flows tab for the workflow instead of only
  // deep-linking to the external flow detail page.
  onOpenFlow?: (workflowId: string) => void
}

const ACTION_LABELS: Record<string, { label: string; description: string }> = {
  search: { label: 'Search', description: 'Looked up an existing record' },
  create: { label: 'Create', description: 'Created a new record' },
  update: { label: 'Update', description: 'Updated an existing record' },
  timeline: { label: 'Timeline', description: 'Read record history' },
  note: { label: 'Note', description: 'Added a note' },
  task: { label: 'Task', description: 'Logged a follow-up task' },
  flow: { label: 'Flow', description: 'Started a workflow' }
}

const CRM_LINK_FIELDS: Array<{ key: string; entityType: 'account' | 'contact'; label: string }> = [
  { key: 'account_id', entityType: 'account', label: 'Account' },
  { key: 'contact_id', entityType: 'contact', label: 'Contact' }
]

function describeAction(action: string): { label: string; description: string } {
  return ACTION_LABELS[action] ?? { label: action, description: 'Tool call' }
}

function actionKey(entry: WorkforceRunDomainAction, index: number): string {
  if (typeof entry.seq === 'number') return `${entry.seq}:${entry.tool_ref}`
  if (entry.timestamp) return `${entry.timestamp}:${entry.tool_ref}:${index}`
  return `${entry.tool_ref}:${index}`
}

const CrmRecordLink: React.FC<{ entityType: 'account' | 'contact'; entityId: string; label: string }> = ({
  entityType,
  entityId,
  label
}) => {
  const url = buildEntityNavigationUrl(entityType, entityId, 'workforce-run')
  const idLabel = `${label}: ${entityId}`
  if (!url) {
    return (
      <span
        className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-muted-foreground"
        data-testid={`entity-id-${entityType}`}
      >
        {idLabel}
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-primary/40 gba:bg-primary/5 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-primary gba:hover:bg-primary/10"
      data-testid={`entity-link-${entityType}`}
    >
      {idLabel}
      <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
    </a>
  )
}

const IdChip: React.FC<{ name: string; value: string }> = ({ name, value }) => (
  <span className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-muted-foreground">
    {name}: {value}
  </span>
)

const RecordIds: React.FC<{
  domain: string
  recordIds: Record<string, string>
}> = ({ domain, recordIds }) => {
  const isCrm = domain === 'crm'
  const linkable = isCrm ? CRM_LINK_FIELDS.filter(field => Boolean(recordIds[field.key])) : []
  const linkedKeys = new Set(linkable.map(field => field.key))
  const extraIds = Object.entries(recordIds).filter(([key]) => !linkedKeys.has(key))
  if (linkable.length === 0 && extraIds.length === 0) return null
  return (
    <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5">
      {linkable.map(field => (
        <CrmRecordLink
          key={field.key}
          entityType={field.entityType}
          entityId={recordIds[field.key]}
          label={field.label}
        />
      ))}
      {extraIds.map(([key, value]) => (
        <IdChip key={key} name={key} value={value} />
      ))}
    </div>
  )
}

const CaseBanner: React.FC<{ caseRef: WorkforceRunCaseRef }> = ({ caseRef }) => {
  const label = caseRef.entity_type ? `${caseRef.entity_type} · ${caseRef.record_id}` : caseRef.record_id
  return (
    <div
      className="gba:mb-2 gba:flex gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-primary/30 gba:bg-primary/5 gba:px-3 gba:py-2"
      data-testid="workforce-run-case-ref"
    >
      <BriefcaseIcon className="gba:h-4 gba:w-4 gba:text-primary" />
      <div className="gba:min-w-0">
        <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          Case assigned
        </p>
        <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground">{label}</p>
      </div>
    </div>
  )
}

export const RunEntityLinks: React.FC<RunEntityLinksProps> = ({ actions, caseRef, accessToken, onOpenFlow }) => {
  if ((!actions || actions.length === 0) && !caseRef) return null

  return (
    <section data-testid="workforce-run-detail-entity-links">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        Records & actions
      </h3>
      {caseRef && <CaseBanner caseRef={caseRef} />}
      {actions && actions.length > 0 && (
        <ul className="gba:space-y-1.5">
          {actions.map((entry, index) => {
            const meta = describeAction(entry.action)
            const recordIds = entry.record_ids ?? {}
            const isFlow = (entry.domain ?? 'crm') === 'flow'
            const workflowId = recordIds.workflow_id
            return (
              <li
                key={actionKey(entry, index)}
                className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:text-xs gba:text-foreground"
                data-testid="entity-action-row"
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                  <div className="gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      {entry.succeeded ? (
                        <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-500" />
                      ) : (
                        <WarningCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />
                      )}
                      <span className="gba:font-semibold">{meta.label}</span>
                      {entry.entity_type && (
                        <span className="gba:text-[11px] gba:text-muted-foreground">· {entry.entity_type}</span>
                      )}
                    </div>
                    <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
                      {meta.description} · <span className="gba:font-mono">{entry.tool_ref}</span>
                    </p>
                  </div>
                  {entry.timestamp && (
                    <span className="gba:shrink-0 gba:text-[11px] gba:text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  )}
                </div>
                {isFlow ? (
                  <FlowActionDetails
                    workflowId={workflowId}
                    templateId={recordIds.template_id}
                    workflowName={(workflowId && entry.record_labels?.[workflowId]) || 'Workflow'}
                    accessToken={accessToken}
                    succeeded={entry.succeeded}
                    onOpenFlow={onOpenFlow}
                  />
                ) : (
                  <RecordIds domain={entry.domain ?? 'crm'} recordIds={recordIds} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
