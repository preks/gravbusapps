import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'

type AssignmentModeValue = 'CLAIM' | 'ASSIGN' | 'ASSIGN_DEFERRED' | (string & {})

type AssignmentTargetShape = {
  users?: string[]
  organizationalUnits?: string[]
  matrixTeams?: string[]
  companies?: string[]
  siteLocations?: string[]
  costCenters?: string[]
  capabilities?: string[]
}

export type TaskAssignmentShape = {
  targets: AssignmentTargetShape | null
  assignmentMode: AssignmentModeValue
  allowReassignment?: boolean
}

export type AssignmentStrategyId =
  | 'REQUESTER'
  | 'REQUESTER_MANAGER'
  | 'REQUESTER_SKIP_LEVEL_MANAGER'
  | 'REQUESTER_DIRECT_REPORTS'
  | 'START_FIELD_USER'
  | 'START_FIELD_MANAGER'
  | 'CUSTOM_EXPRESSION'

type StartField = { name: string; label: string }

interface AssignmentStrategySelectorProps {
  value: TaskAssignmentShape
  onChange: (next: TaskAssignmentShape) => void
  availableStartFields: StartField[]
  defaultStrategyId?: AssignmentStrategyId
  mode?: 'simple' | 'advanced'
  variant?: 'select' | 'cards'
  disallowedStrategyIds?: AssignmentStrategyId[]
  'data-testid'?: string
}

type ParsedStrategy = { strategyId: AssignmentStrategyId; fieldName?: string; rawExpression?: string }

function normalizeExpr(value: string): string {
  return value.replace(/\s+/g, '').trim()
}

function parseStrategyFromAssignment(assignment: TaskAssignmentShape, fallback: AssignmentStrategyId): ParsedStrategy {
  const users = assignment.targets?.users
  const raw = Array.isArray(users) && users.length > 0 ? String(users[0] ?? '') : ''
  const rawExpression = raw.trim()
  const expr = normalizeExpr(raw)

  if (expr === '{{$workflow.initiator}}') return { strategyId: 'REQUESTER', rawExpression }
  if (expr === '{{$orgchart.managerByUserId[$workflow.initiator]}}')
    return { strategyId: 'REQUESTER_MANAGER', rawExpression }
  if (expr === '{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}') {
    return { strategyId: 'REQUESTER_SKIP_LEVEL_MANAGER', rawExpression }
  }
  if (expr === '{{$orgchart.directReportsByUserId[$workflow.initiator]}}') {
    return { strategyId: 'REQUESTER_DIRECT_REPORTS', rawExpression }
  }

  const userFromField = expr.match(/^\{\{\$orgchart\.userIdByEmployeeId\[\$workflow\.input\.([a-zA-Z0-9_]+)\]\}\}$/)
  if (userFromField?.[1]) return { strategyId: 'START_FIELD_USER', fieldName: userFromField[1], rawExpression }

  const managerFromField = expr.match(/^\{\{\$orgchart\.manager\[\$workflow\.input\.([a-zA-Z0-9_]+)\]\}\}$/)
  if (managerFromField?.[1]) return { strategyId: 'START_FIELD_MANAGER', fieldName: managerFromField[1], rawExpression }

  if (rawExpression) return { strategyId: 'CUSTOM_EXPRESSION', rawExpression }
  return { strategyId: fallback, rawExpression }
}

function buildExpression(strategyId: AssignmentStrategyId, fieldName?: string): string {
  switch (strategyId) {
    case 'REQUESTER':
      return '{{$workflow.initiator}}'
    case 'REQUESTER_MANAGER':
      return '{{$orgchart.managerByUserId[$workflow.initiator]}}'
    case 'REQUESTER_SKIP_LEVEL_MANAGER':
      return '{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}'
    case 'REQUESTER_DIRECT_REPORTS':
      return '{{$orgchart.directReportsByUserId[$workflow.initiator]}}'
    case 'START_FIELD_USER':
      return `{{$orgchart.userIdByEmployeeId[$workflow.input.${fieldName || 'field'}]}}`
    case 'START_FIELD_MANAGER':
      return `{{$orgchart.manager[$workflow.input.${fieldName || 'field'}]}}`
    case 'CUSTOM_EXPRESSION':
      return ''
    default:
      return '{{$workflow.initiator}}'
  }
}

export const AssignmentStrategySelector: React.FC<AssignmentStrategySelectorProps> = ({
  value,
  onChange,
  availableStartFields,
  defaultStrategyId = 'REQUESTER_MANAGER',
  mode = 'simple',
  variant = 'select',
  disallowedStrategyIds,
  'data-testid': testId = 'assignment-strategy-selector'
}) => {
  const derived = useMemo(() => parseStrategyFromAssignment(value, defaultStrategyId), [value, defaultStrategyId])

  const disallowed = useMemo(() => new Set<AssignmentStrategyId>(disallowedStrategyIds ?? []), [disallowedStrategyIds])

  const [selectedStrategyId, setSelectedStrategyId] = useState<AssignmentStrategyId>(
    disallowed.has(derived.strategyId) ? defaultStrategyId : derived.strategyId
  )
  const [selectedFieldName, setSelectedFieldName] = useState<string | undefined>(derived.fieldName)
  const lastUserEditAtRef = useRef<number>(0)
  const didNormalizeDisallowedRef = useRef<boolean>(false)

  useEffect(() => {
    if (Date.now() - lastUserEditAtRef.current < 250) return
    if (selectedStrategyId === 'CUSTOM_EXPRESSION') return
    setSelectedStrategyId(disallowed.has(derived.strategyId) ? defaultStrategyId : derived.strategyId)
    setSelectedFieldName(derived.fieldName)
  }, [defaultStrategyId, derived.fieldName, derived.strategyId, disallowed, selectedStrategyId])

  const needsField = selectedStrategyId === 'START_FIELD_USER' || selectedStrategyId === 'START_FIELD_MANAGER'
  const isCustomExpression = selectedStrategyId === 'CUSTOM_EXPRESSION'

  const fieldOptions = useMemo(
    () => availableStartFields.slice().sort((a, b) => a.label.localeCompare(b.label)),
    [availableStartFields]
  )

  const setStrategy = useCallback(
    (strategyId: string) => {
      const nextStrategyId = strategyId as AssignmentStrategyId
      lastUserEditAtRef.current = Date.now()
      setSelectedStrategyId(nextStrategyId)

      const nextField = nextStrategyId.startsWith('START_FIELD_')
        ? (selectedFieldName ?? fieldOptions[0]?.name)
        : undefined

      if (nextStrategyId.startsWith('START_FIELD_')) {
        setSelectedFieldName(nextField)
      } else if (nextStrategyId !== 'CUSTOM_EXPRESSION') {
        setSelectedFieldName(undefined)
      }

      const current =
        Array.isArray(value.targets?.users) && value.targets?.users?.[0] ? String(value.targets.users[0]) : ''
      const expr = nextStrategyId === 'CUSTOM_EXPRESSION' ? current : buildExpression(nextStrategyId, nextField)

      onChange({
        ...value,
        assignmentMode: 'ASSIGN_DEFERRED',
        targets: {
          users: [expr]
        }
      })
    },
    [fieldOptions, onChange, selectedFieldName, value]
  )

  const setField = useCallback(
    (fieldName: string) => {
      lastUserEditAtRef.current = Date.now()
      setSelectedFieldName(fieldName)
      const expr = buildExpression(selectedStrategyId, fieldName)
      onChange({
        ...value,
        assignmentMode: 'ASSIGN_DEFERRED',
        targets: {
          users: [expr]
        }
      })
    },
    [onChange, selectedStrategyId, value]
  )

  const setCustomExpression = useCallback(
    (raw: string) => {
      lastUserEditAtRef.current = Date.now()
      setSelectedStrategyId('CUSTOM_EXPRESSION')
      onChange({
        ...value,
        assignmentMode: 'ASSIGN_DEFERRED',
        targets: {
          users: [raw]
        }
      })
    },
    [onChange, value]
  )

  const customExpressionValue = useMemo(() => {
    const users = value.targets?.users
    const raw = Array.isArray(users) && users.length > 0 ? String(users[0] ?? '') : ''
    return raw
  }, [value.targets?.users])

  const expressionPreview = useMemo(
    () =>
      selectedStrategyId === 'CUSTOM_EXPRESSION'
        ? customExpressionValue.trim()
        : buildExpression(selectedStrategyId, selectedFieldName),
    [customExpressionValue, selectedFieldName, selectedStrategyId]
  )

  const strategyOptions = useMemo(() => {
    const showSkipLevel = mode === 'advanced' || derived.strategyId === 'REQUESTER_SKIP_LEVEL_MANAGER'
    const showCustom = mode === 'advanced' || derived.strategyId === 'CUSTOM_EXPRESSION'

    const opts: Array<{
      id: AssignmentStrategyId
      title: string
      description: string
      disabled?: boolean
    }> = [
      {
        id: 'REQUESTER',
        title: 'Initiator',
        description: 'Assign to the person who started the workflow.'
      },
      {
        id: 'REQUESTER_MANAGER',
        title: 'Initiator’s manager',
        description: 'Assign to the initiator’s direct manager.'
      },
      ...(showSkipLevel
        ? [
            {
              id: 'REQUESTER_SKIP_LEVEL_MANAGER' as const,
              title: 'Initiator’s skip-level manager',
              description: 'Assign 2 levels up (manager’s manager).',
              disabled: mode !== 'advanced'
            }
          ]
        : []),
      {
        id: 'REQUESTER_DIRECT_REPORTS',
        title: 'Initiator’s direct reports',
        description: 'Assign to multiple people reporting to the initiator.'
      },
      {
        id: 'START_FIELD_USER',
        title: 'Selected person',
        description: 'Assign to a person selected in the start form.',
        disabled: fieldOptions.length === 0
      },
      {
        id: 'START_FIELD_MANAGER',
        title: 'Selected person’s manager',
        description: 'Assign to the manager of a person selected in the start form.',
        disabled: fieldOptions.length === 0
      },
      ...(showCustom
        ? [
            {
              id: 'CUSTOM_EXPRESSION' as const,
              title: 'Custom rule',
              description: 'Use a custom org chart rule.',
              disabled: mode !== 'advanced'
            }
          ]
        : [])
    ]

    const filtered = disallowed.size > 0 ? opts.filter(o => !disallowed.has(o.id)) : opts
    return filtered.length > 0 ? filtered : opts
  }, [derived.strategyId, disallowed, fieldOptions.length, mode])

  const selectedOption = useMemo(
    () => strategyOptions.find(o => o.id === selectedStrategyId) ?? strategyOptions[0],
    [selectedStrategyId, strategyOptions]
  )

  useEffect(() => {
    if (disallowed.size === 0) return
    if (!disallowed.has(derived.strategyId)) {
      didNormalizeDisallowedRef.current = false
      return
    }
    if (didNormalizeDisallowedRef.current) return
    didNormalizeDisallowedRef.current = true

    const next =
      (!disallowed.has(defaultStrategyId) && strategyOptions.some(o => o.id === defaultStrategyId)
        ? defaultStrategyId
        : strategyOptions[0]?.id) ?? defaultStrategyId

    setStrategy(next)
  }, [defaultStrategyId, derived.strategyId, disallowed, setStrategy, strategyOptions])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Assign to</Label>
        {variant === 'cards' ? (
          <RadioGroup
            value={selectedStrategyId}
            onValueChange={setStrategy}
            className="gba:flex gba:flex-col gba:gap-2"
            data-testid={`${testId}-strategy`}
          >
            {strategyOptions.map(opt => {
              const id = `${testId}-strategy-${opt.id}`
              const selected = selectedStrategyId === opt.id
              const disabled = Boolean(opt.disabled)

              return (
                <Label
                  key={opt.id}
                  htmlFor={id}
                  className={[
                    'gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:p-3 gba:cursor-pointer gba:transition-colors',
                    selected ? 'gba:border-primary gba:bg-muted' : 'gba:border-border gba:bg-background',
                    disabled ? 'gba:opacity-50 gba:pointer-events-none' : 'gba:hover:bg-muted'
                  ].join(' ')}
                  data-testid={`${testId}-strategy-option-${opt.id}`}
                >
                  <RadioGroupItem id={id} value={opt.id} disabled={disabled} />
                  <div className="gba:flex gba:flex-col gba:gap-0.5">
                    <span className="gba:text-xs gba:font-semibold gba:text-foreground">{opt.title}</span>
                    <span className="gba:text-xs gba:text-muted-foreground">{opt.description}</span>
                  </div>
                </Label>
              )
            })}
          </RadioGroup>
        ) : (
          <>
            <Select value={selectedStrategyId} onValueChange={setStrategy}>
              <SelectTrigger
                className="gba:h-9 gba:w-full gba:text-xs gba:bg-background"
                data-testid={`${testId}-strategy`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategyOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id} disabled={Boolean(opt.disabled)}>
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption?.description ? (
              <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-strategy-desc`}>
                {selectedOption.description}
              </p>
            ) : null}
          </>
        )}
      </div>

      {needsField && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Start field</Label>
          <Select value={selectedFieldName ?? ''} onValueChange={setField}>
            <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-field`}>
              <SelectValue placeholder={fieldOptions.length ? 'Select a field…' : 'No eligible fields'} />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map(f => (
                <SelectItem key={f.name} value={f.name}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isCustomExpression && mode === 'advanced' ? (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Assignment rule</Label>
          <Textarea
            value={customExpressionValue}
            onChange={e => setCustomExpression(e.target.value)}
            placeholder="{{$orgchart.managerByUserId[$workflow.initiator]}}"
            className="gba:min-h-20 gba:text-xs"
            data-testid={`${testId}-custom-expression`}
          />
          <p className="gba:text-xs gba:text-muted-foreground">
            Use a single rule that resolves to a user id (or an array of user ids).
          </p>
        </div>
      ) : null}

      {mode === 'advanced' ? (
        <p className="gba:text-[11px] gba:text-muted-foreground gba:break-words" data-testid={`${testId}-preview`}>
          {expressionPreview}
        </p>
      ) : null}
    </div>
  )
}
