import { useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CheckCircleIcon, PencilSimpleIcon, ShieldWarningIcon, XCircleIcon } from '@phosphor-icons/react'
import type { StructuredInputRequestEvent } from '../../types/enterpriseAgent'
import {
  formatPermissionDisplayValue,
  formatPermissionValue,
  presentToolPermissionAction,
  type PresentedPermissionAction,
  type PresentedPermissionField
} from './toolPermissionPresenter'

interface ToolPermissionRequestProps {
  request: StructuredInputRequestEvent
  alreadySubmitted?: boolean
  onSubmit: (payload: Record<string, unknown>) => void
}

const actionKey = (action: PresentedPermissionAction): string => `${action.toolName}:${action.summary}`

const PermissionValueDisplay = ({ field }: { field: PresentedPermissionField }) => {
  if (Array.isArray(field.value) && field.value.every(item => ['string', 'number', 'boolean'].includes(typeof item))) {
    return (
      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        {field.value.map(item => (
          <span
            key={`${field.id}-${String(item)}`}
            className="gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-xs gba:text-foreground"
          >
            {String(item)}
          </span>
        ))}
      </div>
    )
  }
  return <span className="gba:whitespace-pre-wrap gba:break-words">{formatPermissionDisplayValue(field.value)}</span>
}

export const ToolPermissionRequest = ({ request, alreadySubmitted = false, onSubmit }: ToolPermissionRequestProps) => {
  const [submitted, setSubmitted] = useState(false)
  const [decisionLabel, setDecisionLabel] = useState<string | null>(alreadySubmitted ? 'Decision submitted' : null)
  const [editing, setEditing] = useState(false)
  const [showTechnical, setShowTechnical] = useState<Record<number, boolean>>({})
  const [editedValues, setEditedValues] = useState<Record<number, Record<string, string>>>({})
  const locked = submitted || alreadySubmitted
  const actions = request.action_requests ?? []
  const presentedActions = useMemo(
    () => actions.map(action => presentToolPermissionAction(action, request.review_configs ?? [])),
    [actions, request.review_configs]
  )

  const updateEditedValue = (actionIndex: number, field: PresentedPermissionField, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [actionIndex]: {
        ...(prev[actionIndex] ?? {}),
        [field.id]: value
      }
    }))
  }

  const submitReject = () => {
    if (locked) return
    setSubmitted(true)
    setDecisionLabel('Rejected')
    onSubmit({
      form_id: request.form_id,
      decision: 'reject',
      decisions: presentedActions.map(action => ({
        type: 'reject',
        message: `User rejected tool action ${action.toolName}.`
      }))
    })
  }

  const submitApprove = () => {
    if (locked) return
    setSubmitted(true)
    const hasEdits = editing && Object.values(editedValues).some(values => Object.keys(values).length > 0)
    setDecisionLabel(editing ? 'Changes submitted' : 'Approved')
    const decisions = presentedActions.map((action, index) => {
      const edits = editedValues[index] ?? {}
      if (!editing || Object.keys(edits).length === 0) return { type: 'approve' }
      return { type: 'edit', edited_action: action.rebuildAction(edits) }
    })
    onSubmit({
      form_id: request.form_id,
      decision: hasEdits ? 'edit' : 'approve',
      decisions
    })
  }

  return (
    <div className="gba:rounded-2xl gba:border gba:border-warning/40 gba:bg-warning/5 gba:p-4 gba:shadow-sm">
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-warning/15 gba:text-warning gba:shrink-0">
          <ShieldWarningIcon className="gba:h-5 gba:w-5" weight="duotone" />
        </div>
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-sm gba:font-semibold gba:text-foreground">
            {request.title || 'Tool approval required'}
          </p>
          <p className="gba:mt-1 gba:text-sm gba:leading-6 gba:text-muted-foreground">
            {request.description || 'Review this proposed tool action before it runs.'}
          </p>
          {presentedActions.length > 0 && (
            <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-2">
              {presentedActions.map((action, actionIndex) => (
                <span
                  key={`${actionIndex}-${actionKey(action)}`}
                  className="gba:rounded-full gba:bg-background gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:text-foreground gba:border gba:border-border"
                >
                  {action.displayToolName}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {presentedActions.length > 0 && (
        <div className="gba:mt-4 gba:space-y-3">
          {presentedActions.map((action, actionIndex) => (
            <div
              key={`${actionIndex}-${actionKey(action)}`}
              className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3"
            >
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                <div>
                  <p className="gba:text-sm gba:font-semibold gba:text-foreground">{action.title}</p>
                  <p className="gba:mt-1 gba:text-sm gba:leading-6 gba:text-muted-foreground">{action.summary}</p>
                </div>
                {action.canEdit && editing && !locked && (
                  <span className="gba:rounded-full gba:bg-warning/10 gba:px-2.5 gba:py-1 gba:text-[11px] gba:font-medium gba:text-warning">
                    Editing
                  </span>
                )}
              </div>

              <div className="gba:mt-3 gba:space-y-2">
                {action.visibleFields.map(field => {
                  const currentValue = editedValues[actionIndex]?.[field.id] ?? formatPermissionValue(field.value)
                  const editable = editing && field.editable && !locked
                  return (
                    <div key={field.id} className="gba:grid gba:grid-cols-[150px_1fr] gba:gap-3 gba:text-sm">
                      <div className="gba:text-muted-foreground">{field.label}</div>
                      <div className="gba:text-foreground">
                        {editable ? (
                          field.options?.length ? (
                            <select
                              value={currentValue}
                              onChange={event => updateEditedValue(actionIndex, field, event.target.value)}
                              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1.5 gba:text-sm"
                            >
                              {field.options.map(option => (
                                <option key={`${field.id}-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : field.inputType === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={currentValue === 'true'}
                              onChange={event => updateEditedValue(actionIndex, field, String(event.target.checked))}
                              className="gba:h-4 gba:w-4"
                            />
                          ) : (
                            <textarea
                              value={currentValue}
                              onChange={event => updateEditedValue(actionIndex, field, event.target.value)}
                              rows={Array.isArray(field.value) || field.inputType === 'textarea' ? 3 : 1}
                              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1.5 gba:text-sm"
                            />
                          )
                        ) : (
                          <PermissionValueDisplay field={field} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {action.technicalFields.length > 0 && (
                <div className="gba:mt-3">
                  <button
                    type="button"
                    onClick={() => setShowTechnical(prev => ({ ...prev, [actionIndex]: !prev[actionIndex] }))}
                    className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground"
                  >
                    {showTechnical[actionIndex] ? 'Hide technical details' : 'Show technical details'}
                  </button>
                  {showTechnical[actionIndex] && (
                    <div className="gba:mt-2 gba:space-y-1 gba:rounded-lg gba:bg-muted/40 gba:p-3">
                      {action.technicalFields.map(field => (
                        <div key={field.id} className="gba:grid gba:grid-cols-[150px_1fr] gba:gap-3 gba:text-xs">
                          <div className="gba:text-muted-foreground">{field.label}</div>
                          <div className="gba:text-foreground">
                            <PermissionValueDisplay field={field} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="gba:mt-4 gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Button type="button" onClick={submitApprove} disabled={locked} data-testid="tool-permission-approve">
          <CheckCircleIcon className="gba:mr-1.5 gba:h-4 gba:w-4" weight="bold" />
          {editing ? 'Save changes and run' : 'Approve and run'}
        </Button>
        {presentedActions.some(action => action.canEdit) && !editing && !locked && (
          <Button type="button" variant="outline" onClick={() => setEditing(true)} data-testid="tool-permission-edit">
            <PencilSimpleIcon className="gba:mr-1.5 gba:h-4 gba:w-4" weight="bold" />
            Modify
          </Button>
        )}
        {editing && !locked && (
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancel changes
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={submitReject}
          disabled={locked}
          data-testid="tool-permission-reject"
        >
          <XCircleIcon className="gba:mr-1.5 gba:h-4 gba:w-4" weight="bold" />
          Reject
        </Button>
        {decisionLabel && <span className="gba:text-xs gba:text-muted-foreground">{decisionLabel}</span>}
      </div>
    </div>
  )
}
