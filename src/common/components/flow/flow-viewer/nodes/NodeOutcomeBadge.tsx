import React from 'react'
import { Popover, PopoverContent, PopoverTrigger, Spinner } from '@newwork/nw-design-system'
import { AlertCircle, FileInput, FileJson, FileOutput } from 'lucide-react'
import type { FlowNodeOutcome } from '../types/viewerTypes'

interface NodeOutcomeBadgeProps {
  outcome?: FlowNodeOutcome
  isAwaitingInput?: boolean
  isRunning?: boolean
  className?: string
  placement?: 'corner' | 'edge'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function toJsonDisplayValue(value: unknown): unknown {
  return deepParseJsonValue(value)
}

function deepParseJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return value
  const parsedValue = typeof value === 'string' ? parseJsonString(value) : value
  if (Array.isArray(parsedValue)) return parsedValue.map(item => deepParseJsonValue(item, depth + 1))
  if (parsedValue && typeof parsedValue === 'object') {
    return Object.fromEntries(
      Object.entries(parsedValue as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        deepParseJsonValue(entryValue, depth + 1)
      ])
    )
  }
  return parsedValue
}

function isStructuredValue(value: unknown): boolean {
  const displayValue = toJsonDisplayValue(value)
  return Boolean(displayValue && typeof displayValue === 'object')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function formatFieldLabel(field: string): string {
  const normalizedField = String(field || '')
    .trim()
    .replace(/[_\s-]+/g, '')
    .toLowerCase()
  if (['decisionbranch', 'branchid', 'selectedbranch'].includes(normalizedField)) return 'Selected branch'

  return String(field || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function formatSubmittedInputValue(label: string, value: unknown): unknown {
  const normalizedLabel = normalizeResultLabel(label)
  if (!normalizedLabel.includes('branch') || typeof value !== 'string') return value

  return value
    .replace(/_?branch$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function isPrimitiveDisplayValue(value: unknown): boolean {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)
}

function flattenStructuredRows(
  value: unknown,
  prefix = '',
  depth = 0
): Array<{ label: string; value: unknown; structured?: boolean }> {
  const displayValue = toJsonDisplayValue(value)
  if (!displayValue || typeof displayValue !== 'object' || depth > 4) {
    if (!prefix) return []
    const displayLabel = formatFieldLabel(prefix)
    return [{ label: displayLabel, value: formatSubmittedInputValue(displayLabel, displayValue) }]
  }

  if (Array.isArray(displayValue)) {
    if (displayValue.every(isPrimitiveDisplayValue)) {
      const displayLabel = formatFieldLabel(prefix || 'Items')
      return [{ label: displayLabel, value: formatSubmittedInputValue(displayLabel, displayValue.join(', ')) }]
    }

    return displayValue.flatMap((entryValue, index) =>
      flattenStructuredRows(entryValue, prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`, depth + 1)
    )
  }

  return Object.entries(displayValue as Record<string, unknown>).flatMap(([key, entryValue]) => {
    const label = prefix ? `${prefix} ${key}` : key
    const displayLabel = formatFieldLabel(label)
    if (isPrimitiveDisplayValue(entryValue)) {
      return [{ label: displayLabel, value: formatSubmittedInputValue(displayLabel, entryValue) }]
    }
    if (Array.isArray(entryValue) && entryValue.every(isPrimitiveDisplayValue)) {
      return [{ label: displayLabel, value: formatSubmittedInputValue(displayLabel, entryValue.join(', ')) }]
    }
    return flattenStructuredRows(entryValue, label, depth + 1)
  })
}

function ParsedStructuredValue({ value }: { value: unknown }) {
  const rows = flattenStructuredRows(value)
  if (rows.length === 0) {
    return <span className="gba:whitespace-pre-wrap gba:break-words">-</span>
  }

  return (
    <div className="gba:rounded gba:border gba:bg-muted/60 gba:p-3 gba:text-xs">
      <div className="gba:grid gba:grid-cols-[8rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
        {rows.map((row, index) => (
          <React.Fragment key={`${row.label}-${index}`}>
            <span className="gba:text-muted-foreground">{row.label}</span>
            <span className="gba:break-words">{formatValue(row.value)}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function getResultRecord(value: unknown): Record<string, unknown> | null {
  const parsedValue = toJsonDisplayValue(value)
  if (!isPlainObject(parsedValue)) return null
  if (isPlainObject(parsedValue.result)) return parsedValue.result
  return parsedValue
}

function hasKnownTestResultShape(record: Record<string, unknown>): boolean {
  return ['message', 'success', 'testMode', 'resultData', 'testResponse'].some(key => key in record)
}

function normalizeResultLabel(label: string): string {
  return String(label || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isBusinessResultField(label: string, value: unknown): boolean {
  const normalizedLabel = normalizeResultLabel(label)
  if (['form data', 'result data', 'submitted answers', 'result', 'output', 'response'].includes(normalizedLabel)) {
    return true
  }

  const record = getResultRecord(value)
  return Boolean(record && hasKnownTestResultShape(record))
}

function hasDisplayableResultValue(value: unknown): boolean {
  const parsedValue = toJsonDisplayValue(value)
  if (parsedValue === null || parsedValue === undefined || parsedValue === '') return false
  if (Array.isArray(parsedValue)) return parsedValue.length > 0
  if (isPlainObject(parsedValue)) return Object.keys(parsedValue).length > 0
  return true
}

function isRunnerSubmittedStepFields(fields: FlowNodeOutcome['fields']): boolean {
  return (fields ?? []).some(
    field =>
      normalizeResultLabel(field.label) === 'comment' &&
      typeof field.value === 'string' &&
      field.value.toLowerCase().includes('auto-completed by flow test runner')
  )
}

function formatBusinessResultLabel(label: string, isRunnerSubmitted = false): string {
  const normalizedLabel = normalizeResultLabel(label)
  if (normalizedLabel === 'form data') return isRunnerSubmitted ? 'Test input' : 'Submitted answers'
  if (normalizedLabel === 'executed by') return 'Completed by'
  return formatFieldLabel(label)
}

function splitStepResultFields(fields: FlowNodeOutcome['fields']): {
  businessFields: FlowNodeOutcome['fields']
  technicalFields: FlowNodeOutcome['fields']
} {
  const businessFields: FlowNodeOutcome['fields'] = []
  const technicalFields: FlowNodeOutcome['fields'] = []

  ;(fields ?? []).forEach(field => {
    if (!hasDisplayableResultValue(field.value)) return
    if (isBusinessResultField(field.label, field.value)) businessFields.push(field)
    else technicalFields.push(field)
  })

  return { businessFields, technicalFields }
}

function HumanResultValue({ value }: { value: unknown }) {
  const record = getResultRecord(value)
  if (!record || !hasKnownTestResultShape(record)) return null

  const message = typeof record.message === 'string' ? record.message : ''
  const resultData = isPlainObject(record.resultData) ? record.resultData : null
  const rows: Array<{ label: string; value: unknown }> = []
  const agentTestMode = typeof record.agentTestMode === 'string' ? record.agentTestMode : ''

  if (agentTestMode === 'TEST_RESPONSE') {
    rows.push({ label: 'Agent completion', value: 'Configured test response was used directly.' })
  } else if (message.includes('did not finish in time')) {
    rows.push({
      label: 'Agent completion',
      value: 'Agent did not complete in time; configured test response was used.'
    })
  }
  if (!resultData && message) rows.push({ label: 'Message', value: message })

  return (
    <div className="gba:rounded gba:border gba:bg-muted/60 gba:p-3 gba:text-xs gba:space-y-3">
      {rows.length > 0 ? (
        <div className="gba:grid gba:grid-cols-[8rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
          {rows.map(row => (
            <React.Fragment key={row.label}>
              <span className="gba:text-muted-foreground">{row.label}</span>
              <span className="gba:break-words">{formatValue(row.value)}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      {resultData ? (
        <div className="gba:space-y-2">
          <div className="gba:text-[11px] gba:font-medium gba:text-muted-foreground">Result</div>
          <div className="gba:grid gba:grid-cols-[8rem_minmax(0,1fr)] gba:gap-x-3 gba:gap-y-2">
            {Object.entries(resultData).map(([key, entryValue]) => (
              <React.Fragment key={key}>
                <span className="gba:text-muted-foreground">{formatFieldLabel(key)}</span>
                <span className="gba:break-words">{formatValue(entryValue)}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function shouldShowRawOutput(outputValue: unknown, fields: FlowNodeOutcome['fields']): boolean {
  const displayValue = toJsonDisplayValue(outputValue)
  if (!fields || fields.length === 0) return displayValue !== undefined
  if (isPlainObject(displayValue)) {
    const keys = Object.keys(displayValue)
    if (keys.length === 1 && keys[0] === 'result' && fields.some(field => field.label === 'Result')) return false
  }
  return false
}

function formatDuration(durationMs: number | undefined): string | null {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) return null
  if (durationMs < 0 || durationMs >= 2_147_000_000) return null
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}

function renderStructuredField(value: unknown): React.ReactNode {
  if (isStructuredValue(value)) {
    if (getResultRecord(value) && hasKnownTestResultShape(getResultRecord(value)!)) {
      return <HumanResultValue value={value} />
    }
    return <ParsedStructuredValue value={value} />
  }
  return (
    <div className="gba:whitespace-pre-wrap gba:break-words gba:rounded gba:border gba:bg-card gba:p-2 gba:text-foreground">
      {formatValue(value)}
    </div>
  )
}

function getInputContextValue(inputValue: unknown): Record<string, unknown> | null {
  if (!isPlainObject(inputValue)) return null
  const contextEntries = Object.entries({
    inputValues: inputValue.inputValues,
    context: inputValue.context,
    runtimeParameters: inputValue.runtimeParameters,
    taskMeta: inputValue.taskMeta,
    workflow: inputValue.workflow
  }).filter(([, value]) => hasDisplayableResultValue(value))
  return contextEntries.length > 0 ? Object.fromEntries(contextEntries) : null
}

const IO_ICON_TRIGGER_CLASS =
  'gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:border gba:bg-card gba:shadow-sm gba:cursor-pointer gba:transition-colors hover:gba:bg-muted'

const IO_POPOVER_CONTENT_CLASS = 'gba:w-[42rem] gba:max-w-[min(42rem,calc(100vw-2rem))] gba:p-0'

/**
 * Renders the I/O access icons for a tested node. Input and output data are each
 * exposed through their own node icon + popover so a single node can surface both
 * what it received and what it produced without crowding the graph.
 */
export const NodeOutcomeBadge: React.FC<NodeOutcomeBadgeProps> = ({
  outcome,
  isAwaitingInput,
  isRunning,
  className,
  placement = 'corner'
}) => {
  if (!outcome && !isAwaitingInput && !isRunning) return null

  const fields = outcome?.fields ?? []
  const hasError = Boolean(outcome?.error)
  const duration = formatDuration(outcome?.durationMs)
  const executionDetailsValue =
    outcome?.executionDetails && Object.keys(outcome.executionDetails).length > 0 ? outcome.executionDetails : undefined
  const outputValue = outcome?.outputData ?? executionDetailsValue
  const hasOutputPayload =
    outcome?.outputData !== undefined || executionDetailsValue !== undefined || hasDisplayableResultValue(outputValue)
  const showRawOutput = shouldShowRawOutput(outputValue, fields)
  const { businessFields, technicalFields } = splitStepResultFields(fields)
  const isRunnerSubmitted = isRunnerSubmittedStepFields(fields)

  const inputValue = outcome?.inputData ?? outcome?.formData
  const inputContextValue = getInputContextValue(inputValue)
  const hasInput =
    hasDisplayableResultValue(inputValue) ||
    (outcome !== undefined && (outcome.inputData !== undefined || outcome.formData !== undefined))
  const showInputSpinner = Boolean(isAwaitingInput && !hasInput)
  const hasOutput =
    (hasOutputPayload && (businessFields.length > 0 || technicalFields.length > 0 || showRawOutput)) ||
    hasError ||
    Boolean(isRunning)

  if (!showInputSpinner && !hasInput && !hasOutput) return null

  const edgePlacement = placement === 'edge'
  const inputTriggerClass = edgePlacement
    ? 'gba:pointer-events-auto gba:absolute gba:-top-3 gba:left-1/2 gba:-translate-x-1/2'
    : ''
  const outputTriggerClass = edgePlacement
    ? 'gba:pointer-events-auto gba:absolute gba:-bottom-3 gba:left-1/2 gba:-translate-x-1/2'
    : ''

  return (
    <div
      className={
        edgePlacement
          ? `gba:pointer-events-none gba:absolute gba:inset-0 ${className ?? ''}`
          : `gba:inline-flex gba:items-center gba:gap-1 ${className ?? ''}`
      }
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      {showInputSpinner ? (
        <span
          className={`${IO_ICON_TRIGGER_CLASS} ${inputTriggerClass} gba:border-info/60 gba:text-info`}
          title="Waiting for step input"
          aria-label="Waiting for step input"
          data-testid="flow-node-input-loading-icon"
        >
          <Spinner size="sm" />
        </span>
      ) : null}

      {hasInput ? (
        <Popover>
          <PopoverTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              className={`${IO_ICON_TRIGGER_CLASS} ${inputTriggerClass} gba:border-info/50 gba:text-info`}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => event.stopPropagation()}
              title="Show input data"
              aria-label="Show input data"
              data-testid="flow-node-input-icon"
            >
              <FileInput className="gba:h-3.5 gba:w-3.5" />
            </span>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="right"
            className={IO_POPOVER_CONTENT_CLASS}
            onClick={event => event.stopPropagation()}
          >
            <div className="gba:border-b gba:px-3 gba:py-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-semibold gba:text-foreground">
                <FileInput className="gba:h-3.5 gba:w-3.5 gba:text-info" />
                Input
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">{outcome?.title || 'Step input'}</div>
            </div>
            <div className="gba:max-h-[70vh] gba:overflow-auto gba:p-4 gba:text-xs">
              <div className="gba:mb-2 gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                Step input
              </div>
              {renderStructuredField(inputValue)}
              {inputContextValue ? (
                <div className="gba:mt-4 gba:border-t gba:pt-3">
                  <div className="gba:mb-2 gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                    Variables and context
                  </div>
                  {renderStructuredField(inputContextValue)}
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}

      {hasOutput ? (
        <Popover>
          <PopoverTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              className={`${IO_ICON_TRIGGER_CLASS} ${outputTriggerClass} ${
                hasError
                  ? 'gba:border-destructive gba:text-destructive'
                  : isRunning
                    ? 'gba:border-info/60 gba:text-info'
                    : 'gba:border-success/60 gba:text-success'
              }`}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => event.stopPropagation()}
              title={isRunning ? 'Task output is loading' : 'Show output data'}
              aria-label={isRunning ? 'Task output is loading' : 'Show output data'}
              data-testid="flow-node-output-icon"
            >
              {hasError ? (
                <AlertCircle className="gba:h-3.5 gba:w-3.5" />
              ) : isRunning ? (
                <Spinner size="sm" />
              ) : (
                <FileOutput className="gba:h-3.5 gba:w-3.5" />
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="right"
            className={IO_POPOVER_CONTENT_CLASS}
            onClick={event => event.stopPropagation()}
          >
            <div className="gba:border-b gba:px-3 gba:py-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-semibold gba:text-foreground">
                {hasError ? (
                  <AlertCircle className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />
                ) : isRunning ? (
                  <Spinner size="sm" />
                ) : (
                  <FileOutput className="gba:h-3.5 gba:w-3.5 gba:text-success" />
                )}
                Output
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">{outcome?.title || 'Step output'}</div>
              <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
                {isRunning ? <span>Running</span> : null}
                {outcome?.status ? <span>{formatFieldLabel(outcome.status)}</span> : null}
                {duration ? <span>Duration: {duration}</span> : null}
              </div>
            </div>
            <div className="gba:max-h-[70vh] gba:overflow-auto gba:p-4 gba:text-xs">
              {isRunning ? (
                <div className="gba:mb-3 gba:flex gba:items-center gba:gap-2 gba:rounded gba:border gba:border-info/30 gba:bg-info/10 gba:p-2 gba:text-info">
                  <Spinner size="sm" />
                  <span>Task is running. Output appears here when this step completes.</span>
                </div>
              ) : null}
              {outcome?.error ? (
                <div className="gba:mb-3 gba:rounded gba:border gba:border-destructive/30 gba:bg-destructive/10 gba:p-2 gba:text-destructive">
                  {outcome.error}
                </div>
              ) : null}
              {businessFields.length > 0 ? (
                <div className="gba:mb-4 gba:space-y-3">
                  {businessFields.map(field => (
                    <div key={field.label} className="gba:space-y-1.5">
                      <div className="gba:font-medium gba:text-muted-foreground">
                        {formatBusinessResultLabel(field.label, isRunnerSubmitted)}
                      </div>
                      {renderStructuredField(field.value)}
                    </div>
                  ))}
                </div>
              ) : null}
              {technicalFields.length > 0 || showRawOutput ? (
                <details className="gba:border-t gba:pt-2">
                  <summary className="gba:cursor-pointer gba:font-medium gba:text-muted-foreground">
                    Technical details
                  </summary>
                  {technicalFields.length > 0 ? (
                    <div className="gba:mt-3 gba:space-y-3">
                      {technicalFields.map(field => (
                        <div key={field.label} className="gba:space-y-1.5">
                          <div className="gba:font-medium gba:text-muted-foreground">
                            {formatBusinessResultLabel(field.label, isRunnerSubmitted)}
                          </div>
                          {renderStructuredField(field.value)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {showRawOutput ? (
                    <>
                      <div className="gba:mt-3 gba:flex gba:items-center gba:gap-1 gba:font-medium gba:text-muted-foreground">
                        <FileJson className="gba:h-3.5 gba:w-3.5" />
                        Raw output
                      </div>
                      <pre className="gba:mt-2 gba:rounded gba:border gba:bg-muted gba:p-3 gba:text-[11px] gba:leading-5 gba:text-foreground">
                        {formatValue(toJsonDisplayValue(outputValue))}
                      </pre>
                    </>
                  ) : null}
                </details>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}
