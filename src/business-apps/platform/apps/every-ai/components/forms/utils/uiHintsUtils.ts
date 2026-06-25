/**
 * UI hint utilities for FlowProposal forms.
 *
 * Reads x-ui-allowlist / x-ui-overrides vendor extensions that flowbot promotes onto the wrapper
 * flow_schema and translates them into:
 *   - the ordered list of fields to render (`buildUiHintFields`)
 *   - the post-submit mutations to apply to the outgoing arguments (`applyUiOverridesToArguments`).
 *
 * Pure functions; safe to unit test in isolation.
 *
 * Lives under `forms/utils/` alongside other form field helpers (not a React component).
 */

export type UiOverrideFixed = {
  type?: string
  value?: any
  source?: string
  title?: string
}

export type UiOverride = {
  widget?: string
  order?: number
  placeholder?: string
  title?: string
  hidden?: boolean
  omit?: boolean
  fixed?: UiOverrideFixed
}

export type UiHints = {
  allowlist: string[]
  overrides: Record<string, UiOverride>
  /**
   * Schema node the allowlist paths are relative to.
   * Usually this is the root flow_schema, but some backends nest hints under
   * properties.flow or properties.task.
   */
  schemaRoot: any
  /** Where the hints were found. */
  source: 'root' | 'properties.flow' | 'properties.task' | 'none'
}

export type UiHintField = {
  /** Normalized full path (no `flow.` / `task.` prefix), e.g. `employeeAbsence.startDate`. */
  fullPath: string
  /** Leaf name for widgets / labels (e.g. `startDate`). */
  fieldName: string
  /**
   * When true, read/write this field at `fullPath` on the root `formData` tree (flat `flow` shape,
   * `objectKey === null`). When false, value lives at `formData[fieldName]` (nested-entity slice).
   */
  nestedFormValue: boolean
  schema: any
  required: boolean
  override?: UiOverride
}

function normalizeUiHintPath(fullPath: string): string {
  const trimmed = fullPath.trim()
  if (trimmed.startsWith('flow.')) return trimmed.slice('flow.'.length)
  if (trimmed.startsWith('task.')) return trimmed.slice('task.'.length)
  return trimmed
}

function readAtNode(node: any): { allowlist: string[]; overrides: Record<string, UiOverride> } {
  const allowlistRaw = node?.['x-ui-allowlist']
  const overridesRaw = node?.['x-ui-overrides']

  const allowlist = Array.isArray(allowlistRaw) ? allowlistRaw.filter((x: any) => typeof x === 'string') : []
  const overrides =
    overridesRaw && typeof overridesRaw === 'object' && !Array.isArray(overridesRaw)
      ? (overridesRaw as Record<string, UiOverride>)
      : {}

  return { allowlist, overrides }
}

export function extractUiHints(flowSchema: any): UiHints {
  // Preferred location: root of flow_schema (flowbot's promote_ui_hints_to_wrapper_schema).
  const root = readAtNode(flowSchema)
  if (root.allowlist.length || Object.keys(root.overrides).length) {
    return { ...root, schemaRoot: flowSchema, source: 'root' }
  }

  // Back-compat: some wrappers nest hints under properties.flow / properties.task.
  const flowNode = flowSchema?.properties?.flow
  const fromFlow = readAtNode(flowNode)
  if (fromFlow.allowlist.length || Object.keys(fromFlow.overrides).length) {
    return { ...fromFlow, schemaRoot: flowNode, source: 'properties.flow' }
  }

  const taskNode = flowSchema?.properties?.task
  const fromTask = readAtNode(taskNode)
  if (fromTask.allowlist.length || Object.keys(fromTask.overrides).length) {
    return { ...fromTask, schemaRoot: taskNode, source: 'properties.task' }
  }

  return { allowlist: [], overrides: {}, schemaRoot: flowSchema, source: 'none' }
}

function tryResolveSchemaAtRoot(root: any, fullPath: string): { schema: any; required: boolean } | null {
  const parts = fullPath.split('.').filter(Boolean)
  if (parts.length === 0 || !root || typeof root !== 'object') return null

  let node: any = root
  let required = false

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]
    const parent = node
    const props = parent?.properties
    node = props?.[key]

    if (!node) return null

    if (i === parts.length - 1) {
      const req = Array.isArray(parent?.required) ? parent.required : []
      required = req.includes(key)
    }
  }

  return { schema: node, required }
}

/**
 * Resolve a dotted path against the root flow_schema and the common flowbot wrappers
 * (`properties.flow`, `properties.task`) so allowlists like `employeeAbsence.startDate` work
 * regardless of where they were declared.
 */
export function resolveSchemaAndRequiredAtPathBest(
  flowSchema: any,
  fullPath: string
): { schema: any; required: boolean } {
  const roots = [flowSchema, flowSchema?.properties?.flow, flowSchema?.properties?.task].filter(
    (r): r is any => r && typeof r === 'object'
  )
  for (const root of roots) {
    const hit = tryResolveSchemaAtRoot(root, fullPath)
    if (hit) return hit
  }

  const last = fullPath.split('.').reduce((lastPart, part) => part || lastPart, '') || fullPath
  return { schema: { type: 'string', title: last }, required: false }
}

/** Explicit `x-ui-overrides[*].order` should stay below this so unordered fields keep allowlist order after them. */
const IMPLICIT_HINT_ORDER_BASE = 1_000_000

export function buildUiHintFields(opts: {
  flowSchema: any
  objectKey: string | null
  allowlist: string[]
  overrides: Record<string, UiOverride>
}): UiHintField[] {
  const { flowSchema, objectKey, allowlist, overrides } = opts
  const prefix = objectKey ? `${objectKey}.` : null

  const pickOverride = (fullPath: string, normalizedPath: string): UiOverride | undefined =>
    overrides?.[fullPath] ??
    overrides?.[normalizedPath] ??
    overrides?.[`flow.${normalizedPath}`] ??
    overrides?.[`task.${normalizedPath}`]

  const items = allowlist
    .map((fullPath, idx) => {
      const normalizedPath = normalizeUiHintPath(fullPath)
      const override = pickOverride(fullPath, normalizedPath)
      if (override?.omit) return null
      if (override?.hidden) return null

      // Flattened view: render only entries that match the chosen objectKey prefix.
      if (prefix) {
        if (normalizedPath.startsWith(prefix)) {
          const fieldName = normalizedPath.slice(prefix.length)
          const resolved = resolveSchemaAndRequiredAtPathBest(flowSchema, normalizedPath)
          return {
            fullPath: normalizedPath,
            fieldName,
            nestedFormValue: false,
            schema: resolved.schema,
            required: resolved.required,
            override,
            _idx: idx
          }
        }
        // Flat allowlist entries (e.g. `startDate`) still map to the nested entity slice.
        if (!normalizedPath.includes('.')) {
          const nestedPath = `${prefix.slice(0, -1)}${normalizedPath}`
          const fieldName = normalizedPath
          const resolved = resolveSchemaAndRequiredAtPathBest(flowSchema, nestedPath)
          return {
            fullPath: nestedPath,
            fieldName,
            nestedFormValue: false,
            schema: resolved.schema,
            required: resolved.required,
            override,
            _idx: idx
          }
        }
        return null
      }

      // Full `flow` / `task` root in formData: dotted paths address nested keys (e.g.
      // `employeeAbsence.startDate`).
      if (normalizedPath.includes('.')) {
        const resolved = resolveSchemaAndRequiredAtPathBest(flowSchema, normalizedPath)
        const segs = normalizedPath.split('.').filter(Boolean)
        const fieldName = segs[segs.length - 1] || normalizedPath
        return {
          fullPath: normalizedPath,
          fieldName,
          nestedFormValue: true,
          schema: resolved.schema,
          required: resolved.required,
          override,
          _idx: idx
        }
      }

      const resolved = resolveSchemaAndRequiredAtPathBest(flowSchema, normalizedPath)
      return {
        fullPath: normalizedPath,
        fieldName: normalizedPath,
        nestedFormValue: false,
        schema: resolved.schema,
        required: resolved.required,
        override,
        _idx: idx
      }
    })
    .filter(Boolean) as Array<UiHintField & { _idx: number }>

  items.sort((a, b) => {
    const orderA = typeof a.override?.order === 'number' ? a.override.order : IMPLICIT_HINT_ORDER_BASE + a._idx
    const orderB = typeof b.override?.order === 'number' ? b.override.order : IMPLICIT_HINT_ORDER_BASE + b._idx
    if (orderA !== orderB) return orderA - orderB
    return a._idx - b._idx
  })

  return items.map(
    (item): UiHintField => ({
      fullPath: item.fullPath,
      fieldName: item.fieldName,
      nestedFormValue: item.nestedFormValue,
      schema: item.schema,
      required: item.required,
      override: item.override
    })
  )
}

function setNestedValueInPlace(root: any, pathParts: string[], value: any) {
  if (!root || typeof root !== 'object') return
  if (pathParts.length === 0) return
  let curr = root
  for (let i = 0; i < pathParts.length - 1; i++) {
    const k = pathParts[i]
    const next = curr[k]
    if (!next || typeof next !== 'object') curr[k] = {}
    curr = curr[k]
  }
  curr[pathParts[pathParts.length - 1]] = value
}

/**
 * Read the value at a dotted `fixed.source` path against the resolved override root (the same
 * flow/task container or nested entity the override path writes to). Returns `undefined` when any
 * segment is missing so callers can treat it as a no-op.
 */
function resolveFixedSource(root: any, sourcePath: string): any {
  if (!root || typeof root !== 'object') return undefined
  const parts = normalizeUiHintPath(sourcePath).split('.').filter(Boolean)
  if (parts.length === 0) return undefined
  let curr: any = root
  for (const part of parts) {
    if (!curr || typeof curr !== 'object') return undefined
    curr = curr[part]
  }
  return curr
}

function deleteNestedValueInPlace(root: any, pathParts: string[]) {
  if (!root || typeof root !== 'object') return
  if (pathParts.length === 0) return
  let curr = root
  for (let i = 0; i < pathParts.length - 1; i++) {
    const k = pathParts[i]
    if (!curr[k] || typeof curr[k] !== 'object') return
    curr = curr[k]
  }
  delete curr[pathParts[pathParts.length - 1]]
}

function pickTargetRoot(args: { flow?: any; task?: any }, firstKey: string): 'flow' | 'task' {
  const flowHas =
    args.flow && typeof args.flow === 'object' && Object.prototype.hasOwnProperty.call(args.flow, firstKey)
  const taskHas =
    args.task && typeof args.task === 'object' && Object.prototype.hasOwnProperty.call(args.task, firstKey)
  if (flowHas) return 'flow'
  if (taskHas) return 'task'
  return 'flow'
}

function isRecordValue(value: any): value is Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * When DynamicFormDisplay uses a nested entity slice (`objectKey` + `sourceType`), overrides may use
 * absolute paths from the flow/task container (`employeeAbsence.startDate`), slice-relative paths
 * that the entity owns (`typeRef`), or genuinely top-level wire fields (`flowType`, top-level
 * `startDate`). This picks the object to mutate and the path segments, keeping top-level/injected
 * fields on the container root and only descending into the entity for keys it actually defines.
 */
export type UiApplyRoutingContext = {
  sourceType: 'flow' | 'task'
  objectKey: string | null
}

function resolveRoutedMutationTarget(
  next: { flow?: Record<string, any>; task?: Record<string, any> },
  normalizedPath: string,
  parts: string[],
  ctx?: UiApplyRoutingContext | null,
  override?: UiOverride | null
): { root: Record<string, any>; parts: string[] } | null {
  const objectKey = ctx?.objectKey ?? null
  const sourceType = ctx?.sourceType

  if (!objectKey || !sourceType) return null

  const container = next[sourceType]
  if (!isRecordValue(container)) return null

  // Absolute path into / equal to the slice entity (e.g. `employeeAbsence.typeRef`): write it on
  // the container using the full path segments.
  if (normalizedPath === objectKey || normalizedPath.startsWith(`${objectKey}.`)) {
    return { root: container, parts }
  }

  // A `fixed.source` that copies FROM the slice entity targets a root-level mirror field
  // (e.g. top-level `startDate` <- `employeeAbsence.startDate`), so it must live on the container
  // root, not inside the entity.
  const fixedSource = typeof override?.fixed?.source === 'string' ? override.fixed.source : ''
  if (fixedSource && normalizeUiHintPath(fixedSource).startsWith(`${objectKey}.`)) {
    return { root: container, parts }
  }

  const head = parts[0]
  // Already a top-level key on the flow/task container: keep it there.
  if (Object.prototype.hasOwnProperty.call(container, head)) return null

  // Only descend into the slice entity for keys it actually owns (legacy slice-relative overrides
  // like `typeRef` / `value`). Genuinely new top-level wire fields the entity does not define
  // (e.g. `flowType`, `employeeDetails`) stay on the container root.
  const entity = container[objectKey]
  if (isRecordValue(entity) && Object.prototype.hasOwnProperty.call(entity, head)) {
    return { root: entity, parts }
  }

  return { root: container, parts }
}

function resolveApplyMutationTarget(
  next: { flow?: Record<string, any>; task?: Record<string, any> },
  normalizedPath: string,
  ctx?: UiApplyRoutingContext | null,
  override?: UiOverride | null
): { root: Record<string, any>; parts: string[] } | null {
  const parts = normalizedPath.split('.').filter(Boolean)
  if (parts.length === 0) return null

  const routedTarget = resolveRoutedMutationTarget(next, normalizedPath, parts, ctx, override)
  if (routedTarget) return routedTarget

  const bucket = pickTargetRoot(next, parts[0])
  const root = next[bucket]
  if (!isRecordValue(root)) return null
  return { root, parts }
}

/**
 * Apply `omit`, `fixed.value`, and `fixed.source` overrides to the outgoing arguments.
 *
 * - `omit: true` + no `fixed`        → remove the path from flow/task entirely.
 * - `omit: true` + `fixed`           → "hidden but sent": don't render, but still set the resolved
 *                                       fixed value/source on the wire payload (e.g. `event`).
 * - `fixed: { value }`               → force the path to the fixed value (works for both visible and
 *                                       hidden+fixed fields, e.g. `employeeAbsence.typeRef`).
 * - `fixed: { source }`              → copy the value from another field in the same resolved root
 *                                       (e.g. top-level `startDate` ← `employeeAbsence.startDate`).
 *                                       A missing source path is a no-op (the field is left as-is).
 * - `hidden: true` only              → no-op; the field's RHF/initial value is preserved.
 *
 * Optional `routing` aligns paths with how DynamicFormDisplay merges the nested entity
 * (`sourceType` + `objectKey`): absolute paths use the flow/task container; segment-first paths
 * that are not top-level keys on that container apply under `task[objectKey]` / `flow[objectKey]`.
 *
 * Returned object is a shallow clone of args with shallow clones of flow/task.
 */
export function applyUiOverridesToArguments(
  args: { flow?: Record<string, any>; task?: Record<string, any> },
  overrides: Record<string, UiOverride>,
  routing?: UiApplyRoutingContext | null
) {
  const next: { flow?: Record<string, any>; task?: Record<string, any> } = {
    ...args,
    flow: args?.flow ? { ...args.flow } : args?.flow,
    task: args?.task ? { ...args.task } : args?.task
  }

  Object.entries(overrides || {}).forEach(([fullPath, o]) => {
    if (!o || typeof o !== 'object') return
    const normalizedPath = normalizeUiHintPath(fullPath)
    const resolved = resolveApplyMutationTarget(next, normalizedPath, routing ?? null, o)
    if (!resolved) return
    const { root, parts } = resolved

    let valueToSet: any
    let hasValueToSet = false
    if (o.fixed && Object.prototype.hasOwnProperty.call(o.fixed, 'value')) {
      valueToSet = o.fixed.value
      hasValueToSet = true
    } else if (o.fixed && typeof o.fixed.source === 'string' && o.fixed.source.length > 0) {
      const sourced = resolveFixedSource(root, o.fixed.source)
      if (sourced !== undefined) {
        valueToSet = sourced
        hasValueToSet = true
      }
    }

    if (o.omit) {
      // `omit` with a `fixed` value/source is "hidden but sent": keep it on the wire payload.
      // `omit` without any `fixed` (or with an unresolved source) removes the path entirely.
      if (hasValueToSet) {
        setNestedValueInPlace(root, parts, valueToSet)
      } else if (!o.fixed) {
        deleteNestedValueInPlace(root, parts)
      }
      return
    }

    if (hasValueToSet) {
      setNestedValueInPlace(root, parts, valueToSet)
    }
  })

  return next
}
