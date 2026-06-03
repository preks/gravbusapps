import type { ToolPermissionActionRequest, ToolPermissionReviewConfig } from '../../types/enterpriseAgent'

export interface PresentedPermissionFieldOption {
  label: string
  value: string
}

export interface PresentedPermissionField {
  id: string
  label: string
  value: unknown
  path: string[]
  editable: boolean
  technical?: boolean
  // ``required`` means the backend schema lists the field in ``required`` — i.e.
  // the write fails without it (red ``*``). ``suggested`` means the agent
  // pre-filled a non-required field: worth confirming, but NOT a hard rule, so
  // it must not show a red ``*`` (avoids inheriting FlowBot's unstable
  // "every prefilled key is required" behaviour).
  required?: boolean
  suggested?: boolean
  displayValue?: string
  options?: PresentedPermissionFieldOption[]
  inputType?: 'text' | 'textarea' | 'select' | 'boolean'
}

export interface PresentedPermissionAction {
  toolName: string
  displayToolName: string
  title: string
  summary: string
  visibleFields: PresentedPermissionField[]
  technicalFields: PresentedPermissionField[]
  canEdit: boolean
  rebuildAction: (editedValues: Record<string, string>) => ToolPermissionActionRequest
}

const TECHNICAL_KEYS = new Set([
  'id',
  'entity_id',
  'entity_type',
  'employee_id',
  'author_employee_id',
  'substitute_employee_id',
  'type_ref',
  'priority_ref',
  'status_ref',
  'leadStatusRef',
  'leadSourceRef',
  'leadRatingRef',
  'tool_name'
])

const WRAPPER_TOOLS = new Set([
  'newwork_call_business_tool',
  'newwork_execute_business_tool',
  'newwork_query_business_tool'
])

export function humanizePermissionLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

export function formatPermissionDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map(item => formatPermissionDisplayValue(item)).join('\n')
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

export function formatPermissionValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

const fieldId = (path: string[]): string => path.join('.')

const getPath = (value: unknown, path: string[]): unknown => {
  let current = value
  for (const part of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

const setPath = (target: Record<string, unknown>, path: string[], value: unknown): void => {
  let current: Record<string, unknown> = target
  for (const part of path.slice(0, -1)) {
    const next = current[part]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[path[path.length - 1]] = value
}

const actionArgs = (action: ToolPermissionActionRequest): Record<string, unknown> => {
  if (action.args && typeof action.args === 'object') return action.args
  if (action.arguments && typeof action.arguments === 'object') return action.arguments
  return {}
}

const cloneRecord = (value: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(value))

const businessToolName = (action: ToolPermissionActionRequest): string => {
  const args = actionArgs(action)
  const nestedToolName = args.tool_name
  if (typeof action.canonical_function_name === 'string' && action.canonical_function_name.trim()) {
    return action.canonical_function_name
  }
  if (typeof nestedToolName === 'string' && nestedToolName.trim()) return nestedToolName
  return action.name || 'tool_action'
}

const businessArgs = (action: ToolPermissionActionRequest): Record<string, unknown> => {
  const args = actionArgs(action)
  const explicitArguments = args.arguments
  if (explicitArguments && typeof explicitArguments === 'object' && !Array.isArray(explicitArguments)) {
    return explicitArguments as Record<string, unknown>
  }
  const nestedFields = args.fields
  if (
    nestedFields &&
    typeof nestedFields === 'object' &&
    !Array.isArray(nestedFields) &&
    ('entity_type' in nestedFields || 'employee_id' in nestedFields)
  ) {
    return nestedFields as Record<string, unknown>
  }
  return Object.fromEntries(Object.entries(args).filter(([key]) => key !== 'tool_name'))
}

const schemaPropertyForPath = (
  action: ToolPermissionActionRequest,
  path: string[]
): Record<string, unknown> | undefined => {
  let node: unknown = action.input_schema
  for (const part of path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined
    const properties = (node as Record<string, unknown>).properties
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return undefined
    node = (properties as Record<string, unknown>)[part]
  }
  return node && typeof node === 'object' && !Array.isArray(node) ? (node as Record<string, unknown>) : undefined
}

// A field is required when its immediate parent schema object lists it in
// ``required`` (matches FlowBot's per-level required arrays, e.g. asset.required).
const isRequiredForPath = (action: ToolPermissionActionRequest, path: string[]): boolean => {
  let node: unknown = action.input_schema
  for (let index = 0; index < path.length - 1; index += 1) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false
    const properties = (node as Record<string, unknown>).properties
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return false
    node = (properties as Record<string, unknown>)[path[index]]
  }
  const required = node && typeof node === 'object' ? (node as Record<string, unknown>).required : undefined
  return Array.isArray(required) && required.includes(path[path.length - 1])
}

const optionsFromSchema = (
  schema: Record<string, unknown> | undefined
): PresentedPermissionFieldOption[] | undefined => {
  const enumValues = schema?.enum
  if (Array.isArray(enumValues)) {
    return enumValues.map(value => ({ label: String(value), value: String(value) }))
  }
  return undefined
}

const fieldOptionsForPath = (
  action: ToolPermissionActionRequest,
  path: string[]
): PresentedPermissionFieldOption[] | undefined => {
  const options = action.field_options
  const id = fieldId(path)
  const raw = options?.[id] ?? options?.[path[path.length - 1]]
  if (raw?.length) return raw
  return optionsFromSchema(schemaPropertyForPath(action, path))
}

const schemaType = (schema: Record<string, unknown> | undefined): string | undefined => {
  const rawType = schema?.type
  if (Array.isArray(rawType)) return rawType.find(item => item !== 'null')
  return typeof rawType === 'string' ? rawType : undefined
}

const isEditableValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  Array.isArray(value)

const isEmptyFieldValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

const stripRefIdSuffix = (label: string): string => {
  if (label.endsWith(' Ref')) return label.slice(0, -4)
  if (label.endsWith(' Id')) return label.slice(0, -3)
  return label
}

const resolveInputType = (
  selectOptions: PresentedPermissionFieldOption[] | undefined,
  schema: Record<string, unknown> | undefined,
  value: unknown
): PresentedPermissionField['inputType'] => {
  if (selectOptions?.length) return 'select'
  if (schemaType(schema) === 'boolean' || typeof value === 'boolean') return 'boolean'
  if (!isEditableValue(value)) return 'textarea'
  return 'text'
}

const makeField = (
  action: ToolPermissionActionRequest,
  path: string[],
  value: unknown,
  options: { editable: boolean; technical?: boolean; label?: string } = { editable: false }
): PresentedPermissionField => {
  const schema = schemaPropertyForPath(action, path)
  const selectOptions = fieldOptionsForPath(action, path)
  const inputType = resolveInputType(selectOptions, schema, value)
  // Show the friendly catalog label (e.g. "Laptop") instead of the raw ref
  // ("AssetCategory:v1:LAPTOP") in read-only display mode.
  const matchedOption = selectOptions?.find(option => option.value === formatPermissionValue(value))
  const defaultLabel = stripRefIdSuffix(humanizePermissionLabel(path[path.length - 1]))
  const technical = options.technical ?? false
  const required = isRequiredForPath(action, path)
  // Agent pre-filled an optional, visible field: surface it as "suggested"
  // rather than required so users can tell hard rules from assistant guesses.
  const suggested = !required && !technical && !isEmptyFieldValue(value)

  return {
    id: fieldId(path),
    label: options.label ?? defaultLabel,
    value,
    path,
    editable: options.editable,
    technical,
    required,
    suggested,
    displayValue: matchedOption?.label,
    options: selectOptions,
    inputType
  }
}

const canEditAction = (
  action: ToolPermissionActionRequest,
  toolName: string,
  reviewConfigs: ToolPermissionReviewConfig[]
): boolean => {
  const candidates = new Set([action.name, toolName].filter((value): value is string => Boolean(value)))
  return reviewConfigs.some(config => {
    const configActionName = config.action_name || config.actionName
    return Boolean(configActionName && candidates.has(configActionName) && config.allowed_decisions.includes('edit'))
  })
}

const partitionFields = (fields: PresentedPermissionField[]) => ({
  visibleFields: fields.filter(field => !field.technical),
  technicalFields: fields.filter(field => field.technical)
})

const createSummary = (args: Record<string, unknown>, entityType: string): string => {
  const fields = args.fields && typeof args.fields === 'object' && !Array.isArray(args.fields) ? args.fields : {}
  const firstName = String((fields as Record<string, unknown>).firstName ?? '').trim()
  const lastName = String((fields as Record<string, unknown>).lastName ?? '').trim()
  const name = String(
    (fields as Record<string, unknown>).name ?? [firstName, lastName].filter(Boolean).join(' ')
  ).trim()
  const company = String((fields as Record<string, unknown>).companyName ?? '').trim()
  if (entityType === 'lead' && name && company) return `Create a new lead for ${name} at ${company}.`
  if (name) return `Create ${entityType} ${name}.`
  return `Create a new ${entityType}.`
}

const presentCreateCrmEntity = (
  action: ToolPermissionActionRequest,
  args: Record<string, unknown>,
  canEdit: boolean
): Omit<PresentedPermissionAction, 'toolName' | 'displayToolName' | 'canEdit' | 'rebuildAction'> => {
  const entityType = String(args.entity_type ?? 'record')
  const fields = args.fields && typeof args.fields === 'object' && !Array.isArray(args.fields) ? args.fields : {}
  const fieldEntries = Object.entries(fields as Record<string, unknown>).map(([key, value]) =>
    makeField(action, ['fields', key], value, {
      editable: canEdit && isEditableValue(value),
      technical: TECHNICAL_KEYS.has(key)
    })
  )
  return {
    title: `Create ${humanizePermissionLabel(entityType)}`,
    summary: createSummary(args, entityType),
    ...partitionFields([
      makeField(action, ['entity_type'], entityType, { editable: false, technical: true }),
      ...fieldEntries
    ])
  }
}

// Internal/system keys that should never sit in the primary form. These are
// either backend-managed (id, versioning, record bookkeeping) or wrappers
// (meta). They go into the collapsible "technical details" section.
const SYSTEM_FIELD_KEYS = new Set([
  ...TECHNICAL_KEYS,
  'businessKey',
  'recordState',
  'activeTo',
  'additionalProperties',
  'version',
  'creatorEmployee',
  'ownerEmployee',
  'authorEmployee',
  'meta'
])

const isPlainObjectValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// Walk the payload like FlowBot's flow-form pipeline: recurse into nested
// objects (so we use dotted-path options/labels instead of dumping raw JSON),
// keep required + provided fields in the primary form, and collapse empty
// optional fields and system fields into "technical details".
const collectGenericFields = (
  action: ToolPermissionActionRequest,
  value: Record<string, unknown>,
  basePath: string[],
  canEdit: boolean,
  acc: PresentedPermissionField[]
): void => {
  for (const [key, fieldValue] of Object.entries(value)) {
    const path = [...basePath, key]
    if (isPlainObjectValue(fieldValue) && Object.keys(fieldValue).length > 0 && !fieldOptionsForPath(action, path)) {
      collectGenericFields(action, fieldValue, path, canEdit, acc)
      continue
    }
    const required = isRequiredForPath(action, path)
    const technical = SYSTEM_FIELD_KEYS.has(key) || (!required && isEmptyFieldValue(fieldValue))
    acc.push(
      makeField(action, path, fieldValue, {
        editable: canEdit && isEditableValue(fieldValue),
        technical
      })
    )
  }
}

const presentGeneric = (
  action: ToolPermissionActionRequest,
  toolName: string,
  args: Record<string, unknown>,
  canEdit: boolean
): Omit<PresentedPermissionAction, 'toolName' | 'displayToolName' | 'canEdit' | 'rebuildAction'> => {
  const fields: PresentedPermissionField[] = []
  collectGenericFields(action, args, [], canEdit, fields)
  return {
    title: humanizePermissionLabel(toolName),
    summary: `Run ${humanizePermissionLabel(toolName)} after approval.`,
    ...partitionFields(fields)
  }
}

const rebuildArgs = (
  action: ToolPermissionActionRequest,
  originalBusinessArgs: Record<string, unknown>,
  editedValues: Record<string, string>
): Record<string, unknown> => {
  const nextBusinessArgs = cloneRecord(originalBusinessArgs)
  for (const [id, value] of Object.entries(editedValues)) {
    const original = getPath(originalBusinessArgs, id.split('.'))
    const nextValue =
      typeof original === 'boolean'
        ? value === 'true'
        : typeof original === 'number'
          ? Number(value)
          : Array.isArray(original)
            ? value
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean)
            : value
    setPath(nextBusinessArgs, id.split('.'), nextValue)
  }

  const args = cloneRecord(actionArgs(action))
  if (WRAPPER_TOOLS.has(action.name ?? '') && typeof args.tool_name === 'string') {
    args.arguments = nextBusinessArgs
    delete args.fields
    return args
  }
  return nextBusinessArgs
}

export const presentToolPermissionAction = (
  action: ToolPermissionActionRequest,
  reviewConfigs: ToolPermissionReviewConfig[] = []
): PresentedPermissionAction => {
  const toolName = businessToolName(action)
  const args = businessArgs(action)
  const canEdit = canEditAction(action, toolName, reviewConfigs)
  const presented =
    toolName === 'create_crm_entity'
      ? presentCreateCrmEntity(action, args, canEdit)
      : presentGeneric(action, toolName, args, canEdit)

  return {
    toolName,
    displayToolName: humanizePermissionLabel(toolName),
    canEdit,
    rebuildAction: editedValues => ({
      ...action,
      args: rebuildArgs(action, args, editedValues)
    }),
    ...presented
  }
}
