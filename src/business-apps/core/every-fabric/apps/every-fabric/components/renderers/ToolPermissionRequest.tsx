import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDownIcon, CheckCircleIcon, PencilSimpleIcon, ShieldWarningIcon, XCircleIcon } from '@phosphor-icons/react'
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

const formatTechnicalFieldsToggleLabel = (count: number, expanded: boolean): string => {
  if (expanded) return 'Hide additional fields'
  const noun = count === 1 ? 'field' : 'fields'
  return `Show ${count} more ${noun}`
}

interface PermissionFieldEditorProps {
  field: PresentedPermissionField
  currentValue: string
  autoFocus: boolean
  onValueChange: (value: string) => void
}

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
  const text = field.displayValue ?? formatPermissionDisplayValue(field.value)
  return <span className="gba:whitespace-pre-wrap gba:break-words">{text}</span>
}

const PermissionFieldEditor = ({ field, currentValue, autoFocus, onValueChange }: PermissionFieldEditorProps) => {
  if (field.options?.length) {
    return (
      <select
        autoFocus={autoFocus}
        value={currentValue}
        onChange={event => onValueChange(event.target.value)}
        className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1.5 gba:text-sm"
      >
        {field.options.map(option => (
          <option key={`${field.id}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.inputType === 'boolean') {
    return (
      <input
        autoFocus={autoFocus}
        type="checkbox"
        checked={currentValue === 'true'}
        onChange={event => onValueChange(String(event.target.checked))}
        className="gba:h-4 gba:w-4"
      />
    )
  }
  const rows = Array.isArray(field.value) || field.inputType === 'textarea' ? 3 : 1
  return (
    <textarea
      autoFocus={autoFocus}
      value={currentValue}
      onChange={event => onValueChange(event.target.value)}
      rows={rows}
      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1.5 gba:text-sm"
    />
  )
}

interface ClickablePermissionFieldProps {
  field: PresentedPermissionField
  onEdit: () => void
}

const ClickablePermissionField = ({ field, onEdit }: ClickablePermissionFieldProps) => (
  <button
    type="button"
    onClick={onEdit}
    title={field.options?.length ? 'Click to choose another option' : 'Click to edit'}
    className="gba:group gba:-mx-2 gba:flex gba:w-full gba:cursor-pointer gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-transparent gba:px-2 gba:py-1 gba:text-left gba:transition-colors gba:hover:border-border gba:hover:bg-muted/40"
  >
    <span className="gba:min-w-0">
      <PermissionValueDisplay field={field} />
    </span>
    <span className="gba:flex gba:shrink-0 gba:items-center gba:text-muted-foreground">
      {field.options?.length ? (
        <CaretDownIcon className="gba:h-4 gba:w-4 gba:opacity-70" weight="bold" />
      ) : (
        <PencilSimpleIcon
          className="gba:h-3.5 gba:w-3.5 gba:opacity-0 gba:transition-opacity gba:group-hover:opacity-100"
          weight="bold"
        />
      )}
    </span>
  </button>
)

interface PermissionFieldRowProps {
  field: PresentedPermissionField
  actionIndex: number
  action: PresentedPermissionAction
  editing: boolean
  locked: boolean
  focusKey: string | null
  editorKey: string
  editedValues: Record<number, Record<string, string>>
  onUpdateValue: (actionIndex: number, field: PresentedPermissionField, value: string) => void
  onEnterEdit: (editorKey: string) => void
}

const PermissionFieldRow = ({
  field,
  actionIndex,
  action,
  editing,
  locked,
  focusKey,
  editorKey,
  editedValues,
  onUpdateValue,
  onEnterEdit
}: PermissionFieldRowProps) => {
  const currentValue = editedValues[actionIndex]?.[field.id] ?? formatPermissionValue(field.value)
  const showEditor = editing && field.editable && !locked
  const clickToEdit = action.canEdit && field.editable && !editing && !locked
  const autoFocus = focusKey === editorKey

  let valueContent: ReactNode
  if (showEditor) {
    valueContent = (
      <PermissionFieldEditor
        field={field}
        currentValue={currentValue}
        autoFocus={autoFocus}
        onValueChange={value => onUpdateValue(actionIndex, field, value)}
      />
    )
  } else if (clickToEdit) {
    valueContent = <ClickablePermissionField field={field} onEdit={() => onEnterEdit(editorKey)} />
  } else {
    valueContent = <PermissionValueDisplay field={field} />
  }

  return (
    <div className="gba:grid gba:grid-cols-[150px_1fr] gba:gap-3 gba:text-sm">
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground">
        <span>
          {field.label}
          {field.required && <span className="gba:text-destructive"> *</span>}
        </span>
        {field.suggested && !field.required && (
          <span
            title="Pre-filled by the assistant — review and adjust if needed. Not required."
            className="gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground"
          >
            Suggested
          </span>
        )}
      </div>
      <div className="gba:text-foreground">{valueContent}</div>
    </div>
  )
}

export const ToolPermissionRequest = ({ request, alreadySubmitted = false, onSubmit }: ToolPermissionRequestProps) => {
  const [submitted, setSubmitted] = useState(false)
  const [decisionLabel, setDecisionLabel] = useState<string | null>(alreadySubmitted ? 'Decision submitted' : null)
  const [editing, setEditing] = useState(false)
  const [focusKey, setFocusKey] = useState<string | null>(null)
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
                  {action.canEdit && !editing && !locked && (
                    <p className="gba:mt-1 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <PencilSimpleIcon className="gba:h-3 gba:w-3" weight="bold" />
                      Click any field to adjust it before approving.
                    </p>
                  )}
                </div>
                {action.canEdit && editing && !locked && (
                  <span className="gba:rounded-full gba:bg-warning/10 gba:px-2.5 gba:py-1 gba:text-[11px] gba:font-medium gba:text-warning">
                    Editing
                  </span>
                )}
              </div>

              <div className="gba:mt-3 gba:space-y-2">
                {action.visibleFields.map(field => {
                  const editorKey = `${actionIndex}:${field.id}`
                  return (
                    <PermissionFieldRow
                      key={field.id}
                      field={field}
                      actionIndex={actionIndex}
                      action={action}
                      editing={editing}
                      locked={locked}
                      focusKey={focusKey}
                      editorKey={editorKey}
                      editedValues={editedValues}
                      onUpdateValue={updateEditedValue}
                      onEnterEdit={key => {
                        setEditing(true)
                        setFocusKey(key)
                      }}
                    />
                  )
                })}
              </div>

              {(action.visibleFields.some(field => field.required) ||
                action.visibleFields.some(field => field.suggested)) && (
                <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-1 gba:text-[11px] gba:text-muted-foreground">
                  {action.visibleFields.some(field => field.required) && (
                    <span>
                      <span className="gba:text-destructive">*</span> Required
                    </span>
                  )}
                  {action.visibleFields.some(field => field.suggested) && (
                    <span>
                      <span className="gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:font-medium">
                        Suggested
                      </span>{' '}
                      Pre-filled by the assistant
                    </span>
                  )}
                </div>
              )}

              {action.technicalFields.length > 0 && (
                <div className="gba:mt-3">
                  <button
                    type="button"
                    onClick={() => setShowTechnical(prev => ({ ...prev, [actionIndex]: !prev[actionIndex] }))}
                    className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground"
                  >
                    <CaretDownIcon
                      className={`gba:h-3 gba:w-3 gba:transition-transform ${showTechnical[actionIndex] ? 'gba:rotate-180' : ''}`}
                      weight="bold"
                    />
                    {formatTechnicalFieldsToggleLabel(
                      action.technicalFields.length,
                      Boolean(showTechnical[actionIndex])
                    )}
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
