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
import type { AssignmentPersonFieldOption } from '../../../utils/assignmentPersonFieldUtils'

type AssignmentModeValue = 'CLAIM' | 'ASSIGN_SINGLE' | 'ASSIGN' | 'ASSIGN_DEFERRED' | (string & {})

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

interface AssignmentStrategySelectorProps {
  value: TaskAssignmentShape
  onChange: (next: TaskAssignmentShape) => void
  availableStartFields: AssignmentPersonFieldOption[]
  defaultStrategyId?: AssignmentStrategyId
  mode?: 'simple' | 'advanced'
  variant?: 'select' | 'cards'
  disallowedStrategyIds?: AssignmentStrategyId[]
  'data-testid'?: string
}

type ParsedStrategy = { strategyId: AssignmentStrategyId; fieldId?: string; rawExpression?: string }

function normalizeExpr(value: string): string {
  return value.replace(/\s+/g, '').trim()
}

function unwrapExpressionReference(rawExpression: string): string {
  const expr = normalizeExpr(rawExpression)
  if (expr.startsWith('{{') && expr.endsWith('}}')) {
    return expr.slice(2, -2)
  }
  return expr
}

function isExpressionReference(rawExpression: string): boolean {
  const expr = unwrapExpressionReference(rawExpression)
  if (!expr) return false
  return expr.startsWith('$')
}

function requiresDeferredAssignmentExpression(rawExpression: string): boolean {
  const expr = unwrapExpressionReference(rawExpression)
  if (!expr) return false
  return /\$workflow\.input(?:\.|\[|$)/.test(expr) || /\$steps(?:\.|\[|$)/.test(expr)
}

function isMultiUserAssignmentExpression(rawExpression: string): boolean {
  const expr = unwrapExpressionReference(rawExpression)
  if (!expr) return false
  return expr.startsWith('$orgchart.directReportsByUserId[') || expr.startsWith('$orgchart.directReports[')
}

function getFieldOptionId(field: AssignmentPersonFieldOption): string {
  return String(field.id || field.name)
}

function buildLegacyFieldExpression(strategyId: AssignmentStrategyId, fieldName?: string): string {
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
      return `{{$orgchart.userIdByEmployeeId[$workflow.input.inputValues.${fieldName || 'field'}]}}`
    case 'START_FIELD_MANAGER':
      return `{{$orgchart.manager[$workflow.input.inputValues.${fieldName || 'field'}]}}`
    case 'CUSTOM_EXPRESSION':
      return ''
    default:
      return '{{$workflow.initiator}}'
  }
}

function buildFieldExpression(strategyId: AssignmentStrategyId, field?: AssignmentPersonFieldOption): string {
  if (strategyId === 'START_FIELD_USER') {
    return field?.userExpression || buildLegacyFieldExpression(strategyId, field?.name)
  }
  if (strategyId === 'START_FIELD_MANAGER') {
    return field?.managerExpression || buildLegacyFieldExpression(strategyId, field?.name)
  }
  return buildLegacyFieldExpression(strategyId)
}

function inferAssignmentModeForExpression(
  rawExpression: string,
  fallback: AssignmentModeValue = 'ASSIGN_SINGLE'
): AssignmentModeValue {
  const expr = normalizeExpr(rawExpression)
  if (!expr) return fallback
  if (!isExpressionReference(expr)) return fallback
  if (requiresDeferredAssignmentExpression(expr)) return 'ASSIGN_DEFERRED'
  if (isMultiUserAssignmentExpression(expr)) return 'ASSIGN'
  return 'ASSIGN_SINGLE'
}

function inferAssignmentModeForCustomExpression(rawExpression: string): AssignmentModeValue {
  return inferAssignmentModeForExpression(rawExpression, 'ASSIGN_SINGLE')
}

function inferAssignmentModeForStrategy(
  strategyId: AssignmentStrategyId,
  field?: AssignmentPersonFieldOption
): AssignmentModeValue {
  if (strategyId === 'CUSTOM_EXPRESSION') return 'ASSIGN_SINGLE'

  const expression = buildFieldExpression(strategyId, field)
  return inferAssignmentModeForExpression(
    expression,
    strategyId === 'REQUESTER_DIRECT_REPORTS' ? 'ASSIGN' : 'ASSIGN_SINGLE'
  )
}

function inferAssignmentModeForDerivedStrategy(
  strategyId: AssignmentStrategyId,
  rawExpression: string,
  field?: AssignmentPersonFieldOption
): AssignmentModeValue {
  if (strategyId === 'CUSTOM_EXPRESSION') {
    return inferAssignmentModeForCustomExpression(rawExpression)
  }
  return inferAssignmentModeForStrategy(strategyId, field)
}

function inferAssignmentModeForUsers(users: string[]): AssignmentModeValue {
  if (users.length === 0) return 'ASSIGN'
  if (users.some(expression => requiresDeferredAssignmentExpression(expression))) return 'ASSIGN_DEFERRED'
  if (users.length > 1 || users.some(expression => isMultiUserAssignmentExpression(expression))) return 'ASSIGN'
  if (users.some(expression => isExpressionReference(expression))) return 'ASSIGN_SINGLE'
  return 'ASSIGN_SINGLE'
}

export function inferAssignmentModeForTargets(targets: AssignmentTargetShape | null): AssignmentModeValue {
  if (!targets) return 'ASSIGN_SINGLE'

  const users = Array.isArray(targets.users) ? targets.users.filter(Boolean).map(value => String(value)) : []
  return inferAssignmentModeForUsers(users)
}

function findFieldOptionByName(
  fields: AssignmentPersonFieldOption[],
  fieldName?: string
): AssignmentPersonFieldOption | undefined {
  if (!fieldName) return undefined
  return fields.find(field => field.name === fieldName)
}

function parseStrategyFromAssignment(
  assignment: TaskAssignmentShape,
  fallback: AssignmentStrategyId,
  fieldOptions: AssignmentPersonFieldOption[]
): ParsedStrategy {
  const users = assignment.targets?.users
  const raw = Array.isArray(users) && users.length > 0 ? String(users[0] ?? '') : ''
  const rawExpression = raw.trim()
  const expr = normalizeExpr(raw)

  if (expr === '{{$workflow.initiator}}') return { strategyId: 'REQUESTER', rawExpression }
  if (expr === '{{$orgchart.managerByUserId[$workflow.initiator]}}') {
    return { strategyId: 'REQUESTER_MANAGER', rawExpression }
  }
  if (expr === '{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}') {
    return { strategyId: 'REQUESTER_SKIP_LEVEL_MANAGER', rawExpression }
  }
  if (expr === '{{$orgchart.directReportsByUserId[$workflow.initiator]}}') {
    return { strategyId: 'REQUESTER_DIRECT_REPORTS', rawExpression }
  }

  const matchedUserField = fieldOptions.find(
    field => normalizeExpr(buildFieldExpression('START_FIELD_USER', field)) === expr
  )
  if (matchedUserField) {
    return { strategyId: 'START_FIELD_USER', fieldId: getFieldOptionId(matchedUserField), rawExpression }
  }

  const matchedManagerField = fieldOptions.find(
    field => normalizeExpr(buildFieldExpression('START_FIELD_MANAGER', field)) === expr
  )
  if (matchedManagerField) {
    return { strategyId: 'START_FIELD_MANAGER', fieldId: getFieldOptionId(matchedManagerField), rawExpression }
  }

  const legacyStartUserField =
    expr.match(
      /^\{\{\$orgchart\.userIdByEmployeeId\[\$workflow\.input(?:\.(?:formData|inputValues))?\.([a-zA-Z0-9_]+)\]\}\}$/
    )?.[1] || expr.match(/^\{\{\$workflow\.input(?:\.(?:formData|inputValues))?\.([a-zA-Z0-9_]+)\}\}$/)?.[1]
  if (legacyStartUserField) {
    return {
      strategyId: 'START_FIELD_USER',
      fieldId: getFieldOptionId(
        findFieldOptionByName(fieldOptions, legacyStartUserField) || { name: legacyStartUserField, label: '' }
      ),
      rawExpression
    }
  }

  const legacyStartManagerField =
    expr.match(
      /^\{\{\$orgchart\.manager\[\$workflow\.input(?:\.(?:formData|inputValues))?\.([a-zA-Z0-9_]+)\]\}\}$/
    )?.[1] ||
    expr.match(
      /^\{\{\$orgchart\.managerByUserId\[\$workflow\.input(?:\.(?:formData|inputValues))?\.([a-zA-Z0-9_]+)\]\}\}$/
    )?.[1]
  if (legacyStartManagerField) {
    return {
      strategyId: 'START_FIELD_MANAGER',
      fieldId: getFieldOptionId(
        findFieldOptionByName(fieldOptions, legacyStartManagerField) || { name: legacyStartManagerField, label: '' }
      ),
      rawExpression
    }
  }

  if (rawExpression) return { strategyId: 'CUSTOM_EXPRESSION', rawExpression }
  return { strategyId: fallback, rawExpression }
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
  const fieldOptions = useMemo(
    () => availableStartFields.slice().sort((a, b) => a.label.localeCompare(b.label)),
    [availableStartFields]
  )

  const fieldOptionMap = useMemo(() => {
    const map = new Map<string, AssignmentPersonFieldOption>()
    fieldOptions.forEach(field => {
      map.set(getFieldOptionId(field), field)
      if (!map.has(field.name)) {
        map.set(field.name, field)
      }
    })
    return map
  }, [fieldOptions])

  const derived = useMemo(
    () => parseStrategyFromAssignment(value, defaultStrategyId, fieldOptions),
    [defaultStrategyId, fieldOptions, value]
  )

  const disallowed = useMemo(() => new Set<AssignmentStrategyId>(disallowedStrategyIds ?? []), [disallowedStrategyIds])

  const strategyOptions = useMemo(() => {
    const showSkipLevel = mode === 'advanced' || derived.strategyId === 'REQUESTER_SKIP_LEVEL_MANAGER'

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
        description: 'Assign to a person selected earlier in the flow.',
        disabled: fieldOptions.length === 0
      },
      {
        id: 'START_FIELD_MANAGER',
        title: 'Selected person’s manager',
        description: 'Assign to the manager of a person selected earlier in the flow.',
        disabled: fieldOptions.length === 0
      },
      ...(mode === 'advanced'
        ? [
            {
              id: 'CUSTOM_EXPRESSION' as const,
              title: 'Custom rule',
              description: 'Use a custom org chart rule.'
            }
          ]
        : [])
    ]

    const filtered = disallowed.size > 0 ? opts.filter(option => !disallowed.has(option.id)) : opts
    return filtered.length > 0 ? filtered : opts
  }, [derived.strategyId, disallowed, fieldOptions.length, mode])

  const fallbackStrategyId = useMemo(() => {
    const preferred = strategyOptions.find(option => option.id === defaultStrategyId && !option.disabled)
    if (preferred) return preferred.id
    return strategyOptions.find(option => !option.disabled)?.id ?? defaultStrategyId
  }, [defaultStrategyId, strategyOptions])

  const normalizedDerivedStrategyId = useMemo(() => {
    const option = strategyOptions.find(candidate => candidate.id === derived.strategyId)
    if (!option || option.disabled) return fallbackStrategyId
    return option.id
  }, [derived.strategyId, fallbackStrategyId, strategyOptions])

  const derivedFieldId = useMemo(() => {
    if (!derived.fieldId) return undefined
    const field = fieldOptionMap.get(derived.fieldId)
    return field ? getFieldOptionId(field) : undefined
  }, [derived.fieldId, fieldOptionMap])

  const [selectedStrategyId, setSelectedStrategyId] = useState<AssignmentStrategyId>(normalizedDerivedStrategyId)
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(derivedFieldId)
  const lastUserEditAtRef = useRef<number>(0)
  const didNormalizeUnsupportedRef = useRef<boolean>(false)

  useEffect(() => {
    if (Date.now() - lastUserEditAtRef.current < 250) return
    if (selectedStrategyId === 'CUSTOM_EXPRESSION') return
    setSelectedStrategyId(normalizedDerivedStrategyId)
    setSelectedFieldId(derivedFieldId)
  }, [derivedFieldId, normalizedDerivedStrategyId, selectedStrategyId])

  const needsField = selectedStrategyId === 'START_FIELD_USER' || selectedStrategyId === 'START_FIELD_MANAGER'
  const isCustomExpression = selectedStrategyId === 'CUSTOM_EXPRESSION'

  const resolveFieldOption = useCallback(
    (fieldId?: string) => {
      if (!fieldId) return undefined
      return fieldOptionMap.get(fieldId)
    },
    [fieldOptionMap]
  )

  const derivedExpression = useMemo(() => {
    if (derived.strategyId === 'CUSTOM_EXPRESSION') {
      return derived.rawExpression?.trim() ?? ''
    }
    return buildFieldExpression(derived.strategyId, resolveFieldOption(derivedFieldId))
  }, [derived.rawExpression, derived.strategyId, derivedFieldId, resolveFieldOption])
  const normalizedRawExpression = useMemo(
    () => normalizeExpr(derived.rawExpression?.trim() ?? ''),
    [derived.rawExpression]
  )
  const normalizedDerivedExpression = useMemo(() => normalizeExpr(derivedExpression), [derivedExpression])
  const inferredDerivedAssignmentMode = useMemo(
    () =>
      inferAssignmentModeForDerivedStrategy(derived.strategyId, derivedExpression, resolveFieldOption(derivedFieldId)),
    [derived.strategyId, derivedExpression, derivedFieldId, resolveFieldOption]
  )

  const setStrategy = useCallback(
    (strategyId: string) => {
      const nextStrategyId = strategyId as AssignmentStrategyId
      lastUserEditAtRef.current = Date.now()
      setSelectedStrategyId(nextStrategyId)

      const nextField = nextStrategyId.startsWith('START_FIELD_')
        ? resolveFieldOption(selectedFieldId) || resolveFieldOption(derivedFieldId) || fieldOptions[0]
        : undefined
      const nextFieldId = nextField ? getFieldOptionId(nextField) : undefined

      if (nextStrategyId.startsWith('START_FIELD_')) {
        setSelectedFieldId(nextFieldId)
      } else if (nextStrategyId !== 'CUSTOM_EXPRESSION') {
        setSelectedFieldId(undefined)
      }

      const current =
        Array.isArray(value.targets?.users) && value.targets?.users?.[0] ? String(value.targets.users[0]) : ''
      const expr = nextStrategyId === 'CUSTOM_EXPRESSION' ? current : buildFieldExpression(nextStrategyId, nextField)
      const nextAssignmentMode =
        nextStrategyId === 'CUSTOM_EXPRESSION'
          ? inferAssignmentModeForCustomExpression(current)
          : inferAssignmentModeForStrategy(nextStrategyId, nextField)

      onChange({
        ...value,
        assignmentMode: nextAssignmentMode,
        targets: {
          users: [expr]
        }
      })
    },
    [derivedFieldId, fieldOptions, onChange, resolveFieldOption, selectedFieldId, value]
  )

  const setField = useCallback(
    (fieldId: string) => {
      lastUserEditAtRef.current = Date.now()
      const field = resolveFieldOption(fieldId)
      const normalizedFieldId = field ? getFieldOptionId(field) : fieldId
      setSelectedFieldId(normalizedFieldId)
      const nextExpression = buildFieldExpression(selectedStrategyId, field)

      onChange({
        ...value,
        assignmentMode: inferAssignmentModeForStrategy(selectedStrategyId, field),
        targets: {
          users: [nextExpression]
        }
      })
    },
    [onChange, resolveFieldOption, selectedStrategyId, value]
  )

  const setCustomExpression = useCallback(
    (raw: string) => {
      lastUserEditAtRef.current = Date.now()
      setSelectedStrategyId('CUSTOM_EXPRESSION')
      onChange({
        ...value,
        assignmentMode: inferAssignmentModeForCustomExpression(raw),
        targets: {
          users: [raw]
        }
      })
    },
    [onChange, value]
  )

  const customExpressionValue = useMemo(() => {
    const users = value.targets?.users
    return Array.isArray(users) && users.length > 0 ? String(users[0] ?? '') : ''
  }, [value.targets?.users])

  const expressionPreview = useMemo(() => {
    if (selectedStrategyId === 'CUSTOM_EXPRESSION') {
      return customExpressionValue.trim()
    }
    return buildFieldExpression(selectedStrategyId, resolveFieldOption(selectedFieldId))
  }, [customExpressionValue, resolveFieldOption, selectedFieldId, selectedStrategyId])

  const selectedOption = useMemo(
    () => strategyOptions.find(option => option.id === selectedStrategyId) ?? strategyOptions[0],
    [selectedStrategyId, strategyOptions]
  )

  useEffect(() => {
    const derivedNeedsField = derived.strategyId === 'START_FIELD_USER' || derived.strategyId === 'START_FIELD_MANAGER'
    const needsNormalization =
      normalizedDerivedStrategyId !== derived.strategyId ||
      (derivedNeedsField && fieldOptions.length > 0 && !derivedFieldId)

    if (!needsNormalization) {
      didNormalizeUnsupportedRef.current = false
      return
    }
    if (didNormalizeUnsupportedRef.current) return

    didNormalizeUnsupportedRef.current = true
    setStrategy(normalizedDerivedStrategyId)
  }, [
    derived.fieldId,
    derived.strategyId,
    derivedFieldId,
    fieldOptions.length,
    normalizedDerivedStrategyId,
    setStrategy
  ])

  useEffect(() => {
    if (!derivedExpression) return
    if (value.assignmentMode === inferredDerivedAssignmentMode) return

    onChange({
      ...value,
      assignmentMode: inferredDerivedAssignmentMode
    })
  }, [derivedExpression, inferredDerivedAssignmentMode, onChange, value])

  useEffect(() => {
    if (Date.now() - lastUserEditAtRef.current < 250) return
    if (derived.strategyId === 'CUSTOM_EXPRESSION') return
    if (!normalizedRawExpression || !normalizedDerivedExpression) return
    if (normalizedRawExpression === normalizedDerivedExpression) return

    onChange({
      ...value,
      assignmentMode: inferredDerivedAssignmentMode,
      targets: {
        ...(value.targets || {}),
        users: [derivedExpression]
      }
    })
  }, [
    derived.strategyId,
    derivedExpression,
    normalizedDerivedExpression,
    normalizedRawExpression,
    inferredDerivedAssignmentMode,
    onChange,
    value
  ])

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
            {strategyOptions.map(option => {
              const id = `${testId}-strategy-${option.id}`
              const selected = selectedStrategyId === option.id
              const disabled = Boolean(option.disabled)

              return (
                <Label
                  key={option.id}
                  htmlFor={id}
                  className={[
                    'gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:p-3 gba:cursor-pointer gba:transition-colors',
                    selected ? 'gba:border-primary gba:bg-muted' : 'gba:border-border gba:bg-background',
                    disabled ? 'gba:opacity-50 gba:pointer-events-none' : 'gba:hover:bg-muted'
                  ].join(' ')}
                  data-testid={`${testId}-strategy-option-${option.id}`}
                >
                  <RadioGroupItem id={id} value={option.id} disabled={disabled} />
                  <div className="gba:flex gba:flex-col gba:gap-0.5">
                    <span className="gba:text-xs gba:font-semibold gba:text-foreground">{option.title}</span>
                    <span className="gba:text-xs gba:text-muted-foreground">{option.description}</span>
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
                {strategyOptions.map(option => (
                  <SelectItem key={option.id} value={option.id} disabled={Boolean(option.disabled)}>
                    {option.title}
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

      {needsField ? (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Person field</Label>
          <Select value={selectedFieldId ?? ''} onValueChange={setField}>
            <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-field`}>
              <SelectValue placeholder={fieldOptions.length ? 'Select a field…' : 'No eligible fields'} />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map(field => (
                <SelectItem key={getFieldOptionId(field)} value={getFieldOptionId(field)}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isCustomExpression && mode === 'advanced' ? (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Assignment rule</Label>
          <Textarea
            value={customExpressionValue}
            onChange={event => setCustomExpression(event.target.value)}
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
