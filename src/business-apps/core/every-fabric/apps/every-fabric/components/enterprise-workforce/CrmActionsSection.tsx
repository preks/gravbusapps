// Render the compact "what did the agent do in CRM" list inside the
// Workforce run detail drawer.
//
// The CRM application stays the source of truth for accounts, contacts,
// notes, and activities. This section only summarises the agent's CRM
// tool calls (extracted server-side from the session trace) and offers
// deep-links into the existing CRM record pages when an action returned
// a record id. We deliberately do not show full note bodies or timelines
// — those live in CRM and reviewers click through.

import { ArrowSquareOutIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import React from 'react'

import type { WorkforceRunCrmActionEntry } from './workforceTypes'
import { formatTimestamp } from './runDisplay'
import { resolveCrmRecordUrl } from './crmRecordLinks'

export interface CrmActionsSectionProps {
  actions: readonly WorkforceRunCrmActionEntry[]
}

interface ActionLabelMeta {
  label: string
  description: string
}

const ACTION_LABELS: Record<string, ActionLabelMeta> = {
  search: { label: 'Search', description: 'Looked up existing CRM record' },
  create: { label: 'Create', description: 'Created a new CRM record' },
  update: { label: 'Update', description: 'Updated an existing CRM record' },
  timeline: { label: 'Timeline', description: 'Read CRM history' },
  note: { label: 'Note', description: 'Added a CRM note' },
  task: { label: 'Task', description: 'Logged a CRM follow-up task' }
}

const RECORD_LINK_FIELDS: Array<{
  key: string
  testId: string
}> = [
  { key: 'account_id', testId: 'account' },
  { key: 'contact_id', testId: 'contact' },
  { key: 'note_id', testId: 'note' },
  { key: 'task_id', testId: 'task' }
]

function describeAction(action: string): ActionLabelMeta {
  return (
    ACTION_LABELS[action] ?? {
      label: action,
      description: 'CRM tool call'
    }
  )
}

function actionKey(entry: WorkforceRunCrmActionEntry, index: number): string {
  if (typeof entry.seq === 'number') return `${entry.seq}:${entry.tool_ref}`
  if (entry.timestamp) return `${entry.timestamp}:${entry.tool_ref}:${index}`
  return `${entry.tool_ref}:${index}`
}

function recordDisplayLabel(entry: WorkforceRunCrmActionEntry, fieldKey: string, entityId: string): string {
  const fromServer = entry.record_labels?.[entityId]
  if (fromServer) return fromServer
  if (fieldKey === 'note_id') return 'CRM note'
  if (fieldKey === 'task_id') return 'CRM task'
  if (fieldKey === 'account_id') return 'Account'
  if (fieldKey === 'contact_id') return 'Contact'
  return entityId
}

interface RecordLinkProps {
  entry: WorkforceRunCrmActionEntry
  fieldKey: string
  entityId: string
  testId: string
}

const RecordLink: React.FC<RecordLinkProps> = ({ entry, fieldKey, entityId, testId }) => {
  const url = resolveCrmRecordUrl(fieldKey, entityId, entry.entity_type)
  const label = recordDisplayLabel(entry, fieldKey, entityId)
  if (!url) {
    return (
      <span
        className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground"
        data-testid={`crm-action-id-${testId}`}
      >
        {label}
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-primary/40 gba:bg-primary/5 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-primary gba:hover:bg-primary/10"
      data-testid={`crm-action-link-${testId}`}
    >
      {label}
      <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
    </a>
  )
}

export const CrmActionsSection: React.FC<CrmActionsSectionProps> = ({ actions }) => {
  if (!actions || actions.length === 0) return null

  return (
    <section data-testid="workforce-run-detail-crm-actions">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        CRM actions
      </h3>
      <ul className="gba:space-y-1.5">
        {actions.map((entry, index) => {
          const meta = describeAction(entry.action)
          const recordIds = entry.record_ids ?? {}
          const linkable = RECORD_LINK_FIELDS.filter(field => Boolean(recordIds[field.key]))
          const extraIds = Object.entries(recordIds).filter(
            ([key]) => !RECORD_LINK_FIELDS.some(field => field.key === key)
          )
          return (
            <li
              key={actionKey(entry, index)}
              className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:text-xs gba:text-foreground"
              data-testid="crm-action-row"
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
              {(linkable.length > 0 || extraIds.length > 0) && (
                <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5">
                  {linkable.map(field => (
                    <RecordLink
                      key={field.key}
                      entry={entry}
                      fieldKey={field.key}
                      entityId={recordIds[field.key]}
                      testId={field.testId}
                    />
                  ))}
                  {extraIds.map(([key, value]) => (
                    <RecordLink key={key} entry={entry} fieldKey={key} entityId={value} testId={key} />
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
