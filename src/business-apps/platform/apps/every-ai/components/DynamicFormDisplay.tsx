import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Combobox } from '@newwork/nw-design-system'
import type { FlowProposalOutput, ConversationTurn } from '../types/models'
import { useFormSubmission } from './FormSubmissionContext'
import {
  useEmployeeSearchLight,
  useAccountSearch,
  useContactSearch,
  useLeadSearch,
  useOpportunitySearch,
  getEntityTypeFromFieldName,
  type EntityType
} from '../queries/employeeQueries'
import { useVoiceFormContext } from '../context/VoiceFormContext'

interface DynamicFormDisplayProps {
  data: FlowProposalOutput
  onCancel?: () => void
  sendMessage?: (message: string, files: File[]) => void
  conversation?: ConversationTurn[]
  accessToken: string
  isVoiceMode?: boolean
}

interface SchemaFieldProps {
  name: string
  path: string
  schema: any
  required: boolean
  disabled?: boolean
  value: any
  onChange: (value: any) => void
  formData: Record<string, any>
  onFieldValueChange?: (path: string, value: any) => void
}

const sanitizeControlId = (value: string): string => value.replace(/[^a-zA-Z0-9-_:.]/g, '-').toLowerCase()

const deepEquals = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch (error) {
    console.error('[EveryAI][DynamicFormDisplay] Failed deep comparison', error)
    return a === b
  }
}

const toDisplayString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const toOptionId = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return toDisplayString(value)
}

const SchemaField: React.FC<SchemaFieldProps & { accessToken: string }> = ({
  name,
  path,
  schema,
  required,
  disabled,
  value,
  onChange,
  formData,
  onFieldValueChange,
  accessToken
}) => {
  const fieldPath = path ? `${path}.${name}` : name
  const controlId = sanitizeControlId(fieldPath)

  // Format field label
  const formatFieldName = (name: string): string => {
    if (!name) return ''
    let processedName = name
    if (processedName.endsWith('Ref')) {
      processedName = processedName.slice(0, -3)
    }
    return processedName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const label = formatFieldName(name)

  // ============================================================================
  // CONDITIONAL DISPLAY LOGIC
  // ============================================================================

  const displayCondition = schema?.['x-display']

  // Check if field should be displayed based on condition
  const shouldShowField = useMemo(() => {
    if (!displayCondition?.condition) {
      return true
    }

    const { field, operator, value: conditionValue } = displayCondition.condition

    // Build the actual field path for the dependent field
    const dependentFieldPath = path ? `${path}.${field}` : field

    // Get the dependent field value from formData
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => current?.[key], obj)
    }

    const fieldValue = getNestedValue(formData, dependentFieldPath)

    // Handle array values (checkboxes, multi-select)
    if (Array.isArray(fieldValue)) {
      switch (operator) {
        case 'equals':
          // Check if array contains the condition value
          return fieldValue.includes(conditionValue)
        case 'notEquals':
          // Check if array does not contain the condition value
          return !fieldValue.includes(conditionValue)
        case 'contains':
          // Check if any array item contains the condition value
          return fieldValue.some(v => String(v || '').includes(String(conditionValue || '')))
        case 'notContains':
          // Check if no array item contains the condition value
          return !fieldValue.some(v => String(v || '').includes(String(conditionValue || '')))
        default:
          return fieldValue.includes(conditionValue)
      }
    }

    // Evaluate condition based on operator for non-array values
    switch (operator) {
      case 'equals':
        // Handle boolean vs string comparison
        if (typeof fieldValue === 'boolean' && typeof conditionValue === 'string') {
          return fieldValue === (conditionValue.toLowerCase() === 'yes' || conditionValue.toLowerCase() === 'true')
        }
        if (typeof conditionValue === 'boolean' && typeof fieldValue === 'string') {
          return (fieldValue.toLowerCase() === 'yes' || fieldValue.toLowerCase() === 'true') === conditionValue
        }
        return fieldValue === conditionValue
      case 'notEquals':
        // Handle boolean vs string comparison
        if (typeof fieldValue === 'boolean' && typeof conditionValue === 'string') {
          return fieldValue !== (conditionValue.toLowerCase() === 'yes' || conditionValue.toLowerCase() === 'true')
        }
        if (typeof conditionValue === 'boolean' && typeof fieldValue === 'string') {
          return (fieldValue.toLowerCase() === 'yes' || fieldValue.toLowerCase() === 'true') !== conditionValue
        }
        return fieldValue !== conditionValue
      case 'contains':
        return String(fieldValue || '').includes(String(conditionValue || ''))
      case 'notContains':
        return !String(fieldValue || '').includes(String(conditionValue || ''))
      default:
        return fieldValue === conditionValue
    }
  }, [displayCondition, formData, path, name])

  // Clear field value when it becomes hidden
  useEffect(() => {
    if (!shouldShowField && fieldPath && onFieldValueChange) {
      const currentValue = value
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
        onFieldValueChange(fieldPath, '')
      }
    }
  }, [shouldShowField, fieldPath, value, onFieldValueChange])

  // Don't render if condition is not met
  if (!shouldShowField) {
    return null
  }

  // Determine if field should be searchable UUID for people/entities
  const employeeTimeFields = ['substituteEmployee', 'approverId']
  const crmFields = ['ownerEmployee', 'account', 'contact', 'lead', 'opportunity', 'assignedEmployee']
  const irmFields = ['ownerEmployee', 'investmentAccount', 'contact']
  const searchableUuidFields = [...employeeTimeFields, ...crmFields, ...irmFields]
  const isSearchableUuidField =
    searchableUuidFields.includes(name) ||
    (schema?.format === 'uuid' &&
      ((name.toLowerCase().includes('employee') &&
        (name.toLowerCase().includes('substitute') ||
          name.toLowerCase().includes('owner') ||
          name.toLowerCase().includes('assigned'))) ||
        name.toLowerCase().includes('approver') ||
        name.toLowerCase().includes('account') ||
        name.toLowerCase().includes('contact') ||
        name.toLowerCase().includes('lead') ||
        name.toLowerCase().includes('opportunity'))) ||
    name.toLowerCase() === 'substituteemployee' ||
    (name.toLowerCase().includes('substitute') && name.toLowerCase().includes('employee'))

  // Skip technical fields
  if (
    [
      'id',
      'code',
      'version',
      'businessKey',
      'additionalProperties',
      'changeMode',
      'activeTo',
      'recordState',
      'approverId',
      'substituteEmployee',
      'employeeDocument',
      'workingHours',
      'workingDays',
      'calendarDays',
      'effectiveDays',
      'balance'
    ].includes(name) ||
    (schema.format === 'uuid' && !isSearchableUuidField) ||
    schema.type === 'array' ||
    (name.toLowerCase().includes('id') && !isSearchableUuidField) ||
    name.toLowerCase().includes('absencetype')
  ) {
    return null
  }

  const rawFieldType = schema?.type
  const fieldType = Array.isArray(rawFieldType)
    ? (rawFieldType.find(type => typeof type === 'string' && type !== 'null') ?? rawFieldType[0])
    : (rawFieldType ?? (schema?.oneOf || schema?.enum ? 'string' : schema?.properties ? 'object' : undefined))

  const renderField = () => {
    switch (fieldType) {
      case 'string': {
        const rawEnumOptions = schema.enum ?? null
        const rawOneOfOptions = schema.oneOf ?? null

        if (rawEnumOptions || rawOneOfOptions) {
          type SelectOption = { id: string; label: string; rawValue: unknown }
          const options: SelectOption[] = (rawEnumOptions || rawOneOfOptions || []).map((option: unknown, index: number) => {
            const rawValue = rawEnumOptions ? option : ((option as any)?.const ?? (option as any)?.value ?? option)
            const id = String(toOptionId(rawValue ?? index))
            const labelText = String(
              rawEnumOptions ? toDisplayString(option) : ((option as any)?.title ?? toDisplayString(rawValue))
            )
            return {
              id,
              label: labelText,
              rawValue
            }
          })

          const selectedOptionId = String(
            options.find((opt: SelectOption) => deepEquals(opt.rawValue, value))?.id ??
              (value === undefined || value === null ? '' : toOptionId(value))
          )

          return (
            <select
              id={controlId}
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
              value={selectedOptionId}
              onChange={e => {
                const selected = options.find((opt: SelectOption) => opt.id === e.target.value)
                onChange(selected ? selected.rawValue : e.target.value)
              }}
              disabled={disabled}
            >
              <option value="" disabled>
                Select {String(label)}
              </option>
              {options.map((option: SelectOption, idx: number) => (
                <option key={`${controlId}-opt-${idx}`} value={String(option.id)}>
                  {String(option.label)}
                </option>
              ))}
            </select>
          )
        }

        if (schema.format === 'date-time') {
          const formatDateForInput = (dateValue: string | undefined) => {
            if (!dateValue) return ''
            try {
              const date = new Date(dateValue)
              if (Number.isNaN(date.getTime())) return ''
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              return `${year}-${month}-${day}T${hours}:${minutes}`
            } catch {
              return ''
            }
          }

          return (
            <Input
              id={controlId}
              type="datetime-local"
              value={formatDateForInput(typeof value === 'string' ? value : undefined)}
              onChange={e => {
                const inputValue = e.target.value
                if (inputValue) {
                  const date = new Date(inputValue)
                  if (!Number.isNaN(date.getTime())) {
                    onChange(date.toISOString())
                  }
                } else {
                  onChange('')
                }
              }}
              disabled={disabled}
            />
          )
        }

        // Searchable UUID for employees, accounts, contacts, leads, opportunities
        if (isSearchableUuidField || schema.format === 'uuid') {
          return (
            <SearchableUuidField
              controlId={controlId}
              label={label}
              fieldName={name}
              accessToken={accessToken}
              disabled={disabled}
              value={typeof value === 'string' ? value : (value ?? '')}
              onChange={val => onChange(val)}
            />
          )
        }

        return (
          <Input
            id={controlId}
            type="text"
            placeholder={label}
            value={String(typeof value === 'string' ? value : (value ?? ''))}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
          />
        )
      }
      case 'number':
        return (
          <Input
            id={controlId}
            type="number"
            value={typeof value === 'number' ? String(value) : String(value ?? '')}
            onChange={e => {
              const inputValue = e.target.value
              onChange(inputValue === '' ? null : Number(inputValue))
            }}
            disabled={disabled}
          />
        )
      case 'boolean':
        return (
          <div className="gba:flex gba:items-center">
            <input
              type="checkbox"
              id={controlId}
              checked={!!value}
              onChange={e => onChange(e.target.checked)}
              disabled={disabled}
              className="gba:h-4 gba:w-4 gba:rounded gba:border-border"
            />
            <Label htmlFor={controlId} className="gba:ml-2">
              {String(label)}
            </Label>
          </div>
        )
      case 'object': {
        if (!schema.properties) {
          return <div className="gba:text-sm gba:text-muted-foreground">No fields available</div>
        }

        return (
          <div className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-4">
            <p className="gba:text-sm gba:font-medium">{String(label)}</p>
            {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
              <SchemaField
                key={`${fieldPath}.${propName}`}
                name={propName}
                path={fieldPath}
                schema={propSchema}
                required={schema.required?.includes(propName) || false}
                disabled={disabled}
                value={value?.[propName]}
                onChange={newValue => onChange({ ...value, [propName]: newValue })}
                formData={formData}
                onFieldValueChange={onFieldValueChange}
                accessToken={accessToken}
              />
            ))}
          </div>
        )
      }
      default:
        return (
          <div className="gba:text-sm gba:text-muted-foreground">
            Unsupported field type: {toDisplayString(fieldType)}
          </div>
        )
    }
  }

  if (schema.type === 'boolean') {
    return renderField()
  }

  return (
    <div className="gba:mb-4">
      <Label htmlFor={controlId} className="gba:mb-1 gba:block">
        {String(label)} {required && <span className="gba:text-destructive">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}

const SearchableUuidField: React.FC<{
  controlId: string
  label: string
  fieldName: string
  accessToken: string
  disabled?: boolean
  value: string
  onChange: (val: string) => void
}> = ({ controlId, label, fieldName, accessToken, disabled, value, onChange }) => {
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  // Determine entity type from field name
  const entityType: EntityType = getEntityTypeFromFieldName(fieldName)

  // Use appropriate search hook based on entity type
  const { employees, isLoading: employeeLoading } = useEmployeeSearchLight(
    entityType === 'employee' ? accessToken : '',
    { search: entityType === 'employee' ? debouncedSearch : '', limit: 50 }
  )
  const { accounts, isLoading: accountLoading } = useAccountSearch(
    entityType === 'account' ? accessToken : '',
    { search: entityType === 'account' ? debouncedSearch : '', limit: 50 }
  )
  const { contacts, isLoading: contactLoading } = useContactSearch(
    entityType === 'contact' ? accessToken : '',
    { search: entityType === 'contact' ? debouncedSearch : '', limit: 50 }
  )
  const { leads, isLoading: leadLoading } = useLeadSearch(
    entityType === 'lead' ? accessToken : '',
    { search: entityType === 'lead' ? debouncedSearch : '', limit: 50 }
  )
  const { opportunities, isLoading: opportunityLoading } = useOpportunitySearch(
    entityType === 'opportunity' ? accessToken : '',
    { search: entityType === 'opportunity' ? debouncedSearch : '', limit: 50 }
  )

  // Get options and loading state based on entity type
  const { options, isLoading } = useMemo(() => {
    switch (entityType) {
      case 'account':
        return {
          options: accounts.map(a => ({
            value: a.id,
            label: a.name || a.email || a.id
          })),
          isLoading: accountLoading
        }
      case 'contact':
        return {
          options: contacts.map(c => ({
            value: c.id,
            label: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || c.id
          })),
          isLoading: contactLoading
        }
      case 'lead':
        return {
          options: leads.map(l => ({
            value: l.id,
            label: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() + (l.companyName ? ` (${l.companyName})` : '') || l.email || l.id
          })),
          isLoading: leadLoading
        }
      case 'opportunity':
        return {
          options: opportunities.map(o => ({
            value: o.id,
            label: o.name || o.code || o.id
          })),
          isLoading: opportunityLoading
        }
      case 'employee':
      default:
        return {
          options: employees.map(e => ({
            value: e.id,
            label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id
          })),
          isLoading: employeeLoading
        }
    }
  }, [entityType, employees, accounts, contacts, leads, opportunities, employeeLoading, accountLoading, contactLoading, leadLoading, opportunityLoading])

  // Get placeholder text based on entity type
  const placeholderText = useMemo(() => {
    switch (entityType) {
      case 'account': return 'Search accounts...'
      case 'contact': return 'Search contacts...'
      case 'lead': return 'Search leads...'
      case 'opportunity': return 'Search opportunities...'
      default: return 'Search employees...'
    }
  }, [entityType])

  return (
    <div>
      <Combobox
        id={controlId}
        className="gba:w-full"
        options={options}
        value={value || ''}
        onValueChange={v => onChange(v || '')}
        placeholder={`Select ${label}`}
        searchPlaceholder={placeholderText}
        emptyText={isLoading ? 'Loading...' : 'No results'}
        onSearch={setSearch}
        searchDebounce={300}
        loading={Boolean(isLoading)}
        disabled={disabled}
        data-testid={`${controlId}-searchable-uuid`}
      />
    </div>
  )
}

export const DynamicFormDisplay: React.FC<DynamicFormDisplayProps> = ({
  data,
  onCancel,
  sendMessage,
  conversation = [],
  accessToken,
  isVoiceMode = false
}) => {
  const { getFormState, setFormState, clearFormState } = useFormSubmission()
  const voiceFormContext = useVoiceFormContext()

  const formKey = useMemo(() => `form-${data.uuid || data.flow_name || 'default'}`, [data.uuid, data.flow_name])

  // Helper functions for localStorage persistence of submitted forms
  const SUBMITTED_FORMS_KEY = 'everyai-submitted-forms'

  const markFormAsSubmitted = useCallback((formId: string) => {
    try {
      const stored = localStorage.getItem(SUBMITTED_FORMS_KEY)
      const forms: string[] = stored ? JSON.parse(stored) : []
      if (!forms.includes(formId)) {
        forms.push(formId)
      }
      // Keep only the last 100 forms to prevent localStorage bloat
      const trimmedForms = forms.slice(-100)
      localStorage.setItem(SUBMITTED_FORMS_KEY, JSON.stringify(trimmedForms))
      console.log('[DynamicFormDisplay] Marked form as submitted in localStorage:', formId)
    } catch (e) {
      console.warn('[DynamicFormDisplay] Failed to save to localStorage:', e)
    }
  }, [])

  const currentFormState = getFormState(formKey)
  const [uiState, setUiState] = useState(currentFormState)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const formDataRef = useRef<Record<string, any>>({})
  const formSubmissionTurnIndexRef = useRef<number>(-1)
  const initialCheckDoneRef = useRef(false)
  const [initialCheckComplete, setInitialCheckComplete] = useState(false)
  const submissionTriggeredRef = useRef(false)

  // Keep formDataRef in sync with formData state
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Handler for clearing hidden field values
  const handleFieldValueChange = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const pathParts = path.split('.')

      // Navigate to the parent object
      let current: any = newData
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {}
        }
        current = current[pathParts[i]]
      }

      // Set the value
      current[pathParts[pathParts.length - 1]] = value

      return newData
    })
  }, [])

  useEffect(() => {
    setUiState(currentFormState)
  }, [JSON.stringify(currentFormState)])

  // Check if form was already submitted - runs once on mount
  const initialSubmitCheckRef = useRef(false)
  useEffect(() => {
    if (initialSubmitCheckRef.current) return
    initialSubmitCheckRef.current = true

    // Check localStorage first
    const formId = data.uuid || formKey
    try {
      const stored = localStorage.getItem(SUBMITTED_FORMS_KEY)
      const submittedForms: string[] = stored ? JSON.parse(stored) : []
      if (submittedForms.includes(formId)) {
        console.log('[DynamicFormDisplay] Form found in localStorage as submitted:', formId)
        submissionTriggeredRef.current = true
        setInitialCheckComplete(true)
        return
      }
    } catch {
      // localStorage not available
    }

    // Mark initial check complete
    setInitialCheckComplete(true)
  }, []) // Empty dependency array - only run once on mount

  // Check conversation history for submission (fallback)
  useEffect(() => {
    // If we already found a submission/cancellation, don't re-check
    if (submissionTriggeredRef.current) {
      if (!initialCheckComplete) setInitialCheckComplete(true)
      return
    }

    // If conversation is empty, we can still proceed with voice registration
    // (new forms won't be in conversation history anyway)
    if (conversation.length === 0) {
      console.log('[DynamicFormDisplay] Conversation empty - marking check complete for new form')
      setInitialCheckComplete(true)
      return
    }

    // Mark that we've done the check (but allow re-check if conversation changes)
    if (initialCheckDoneRef.current && initialCheckComplete) return
    initialCheckDoneRef.current = true

    console.log('[DynamicFormDisplay] === INITIAL CHECK ===')
    console.log('[DynamicFormDisplay] This form uuid:', data.uuid)
    console.log('[DynamicFormDisplay] This form flow_name:', data.flow_name)
    console.log('[DynamicFormDisplay] Conversation length:', conversation.length)

    // Look for ANY form_submission in the conversation that matches this form
    // We check ALL user turns for a submission matching this form's flow_name
    let foundSubmission = false
    let foundCancellation = false

    for (let i = 0; i < conversation.length; i++) {
      const turn = conversation[i]
      if (turn.side === 'user' && turn.text) {
        // Debug: log user turn text (first 150 chars)
        console.log('[DynamicFormDisplay] User turn', i, ':', turn.text.substring(0, 150))

        // Check for Cancel
        if (turn.text === 'Cancel') {
          console.log('[DynamicFormDisplay] Found Cancel at turn:', i)
          foundCancellation = true
          continue
        }

        // Check for form submission JSON
        try {
          const parsed = JSON.parse(turn.text)
          if (parsed?.action === 'form_submission') {
            console.log('[DynamicFormDisplay] Found form_submission at turn:', i, 'uuid:', parsed?.uuid, 'flow_name:', parsed?.flow_name)
            // Match by UUID, flow_name, or if this form has no UUID yet, match by flow_name
            const uuidMatch = parsed?.uuid && data.uuid && parsed.uuid === data.uuid
            const flowNameMatch = parsed?.flow_name && data.flow_name && parsed.flow_name === data.flow_name
            if (uuidMatch || flowNameMatch) {
              console.log('[DynamicFormDisplay] MATCH! Form was submitted.')
              foundSubmission = true
              formSubmissionTurnIndexRef.current = i
              submissionTriggeredRef.current = true

              // Check for completion or error in subsequent turns
              const turnsAfter = conversation.slice(i + 1)
              let hasError = false
              let hasAnswer = false

              for (const laterTurn of turnsAfter) {
                if (laterTurn.side === 'agent' && 'outputs' in laterTurn) {
                  if (laterTurn.outputs.some(o => o.type === 'error')) {
                    hasError = true
                    break
                  }
                  if (laterTurn.outputs.some(o => o.type === 'answer')) {
                    hasAnswer = true
                    break
                  }
                }
              }

              // Mark as already submitted
              setFormState(formKey, {
                isSubmitted: true,
                isCancelled: false,
                isLoading: false,
                isFlowCompleted: hasAnswer,
                hasError: hasError
              })
              setUiState({
                isSubmitted: true,
                isCancelled: false,
                isLoading: false,
                isFlowCompleted: hasAnswer,
                hasError: hasError
              })
              break
            }
          }
        } catch {
          // Not JSON, ignore
        }
      }
    }

    // If we found cancellation but no submission, mark as cancelled
    if (!foundSubmission && foundCancellation) {
      console.log('[DynamicFormDisplay] Form was cancelled (no submission found)')
      submissionTriggeredRef.current = true
      setFormState(formKey, {
        isSubmitted: false,
        isCancelled: true,
        isLoading: false,
        isFlowCompleted: false,
        hasError: false
      })
      setUiState({
        isSubmitted: false,
        isCancelled: true,
        isLoading: false,
        isFlowCompleted: false,
        hasError: false
      })
    }

    if (!foundSubmission && !foundCancellation) {
      console.log('[DynamicFormDisplay] No submission or cancellation found - form is active')
    }

    // Mark initial check as complete to allow voice registration
    setInitialCheckComplete(true)
  }, [conversation, data.uuid, data.flow_name, formKey, setFormState])

  // Extract initial form values
  const { initialValues, objectKey, sourceType } = useMemo(() => {
    const flowData = data.arguments?.flow || {}
    const taskData = data.arguments?.task || {}

    const taskObjectKey = Object.keys(taskData).find(
      key =>
        typeof taskData[key] === 'object' &&
        !Array.isArray(taskData[key]) &&
        !['changeMode', 'id', 'version', 'businessKey'].includes(key)
    )

    if (taskObjectKey && taskData[taskObjectKey]) {
      return {
        initialValues: { ...taskData[taskObjectKey] },
        objectKey: taskObjectKey,
        sourceType: 'task'
      }
    }

    const flowObjectKey = Object.keys(flowData).find(
      key =>
        typeof flowData[key] === 'object' &&
        !Array.isArray(flowData[key]) &&
        !['changeMode', 'id', 'version', 'businessKey'].includes(key)
    )

    if (flowObjectKey && flowData[flowObjectKey]) {
      return {
        initialValues: { ...flowData[flowObjectKey] },
        objectKey: flowObjectKey,
        sourceType: 'flow'
      }
    }

    const restFlowData = { ...flowData }
    delete restFlowData.changeMode
    return {
      initialValues: restFlowData,
      objectKey: null,
      sourceType: 'flow'
    }
  }, [data.arguments?.flow, data.arguments?.task])

  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFormData(initialValues)
    }
  }, [initialValues])

  const schema = useMemo(() => {
    if (!data.flow_schema || !data.flow_schema.properties) {
      return { type: 'object', properties: {} }
    }

    const schemaProps = data.flow_schema.properties

    if (objectKey && sourceType === 'task' && schemaProps.task?.properties?.[objectKey]?.properties) {
      return {
        type: 'object',
        properties: schemaProps.task.properties[objectKey].properties,
        required: schemaProps.task.properties[objectKey].required
      }
    }

    if (objectKey && sourceType === 'flow' && schemaProps[objectKey]?.properties) {
      return {
        type: 'object',
        properties: schemaProps[objectKey].properties,
        required: schemaProps[objectKey].required
      }
    }

    const restProps = { ...schemaProps }
    delete restProps.changeMode
    return {
      type: 'object',
      properties: restProps
    }
  }, [data.flow_schema, objectKey, sourceType])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (currentFormState.isSubmitted || currentFormState.isLoading) {
        return
      }

      setFormState(formKey, {
        isSubmitted: false,
        isCancelled: false,
        isLoading: true,
        isFlowCompleted: false,
        hasError: false
      })
      setUiState({
        isSubmitted: false,
        isCancelled: false,
        isLoading: true,
        isFlowCompleted: false,
        hasError: false
      })

      try {
        // Use formDataRef.current to get the latest form data
        // This is important because voice commands might update formData
        // and submit before React has a chance to re-render
        const currentFormData = formDataRef.current
        console.log('[DynamicFormDisplay] Submitting with formData:', currentFormData)

        const updatedArguments = { ...data.arguments }
        if (objectKey && sourceType === 'task' && updatedArguments.task?.[objectKey]) {
          updatedArguments.task = {
            ...updatedArguments.task,
            [objectKey]: currentFormData
          }
        } else if (objectKey && sourceType === 'flow' && updatedArguments.flow?.[objectKey]) {
          updatedArguments.flow = {
            ...updatedArguments.flow,
            [objectKey]: currentFormData
          }
        } else {
          updatedArguments.flow = {
            ...currentFormData,
            ...(updatedArguments.flow?.changeMode ? { changeMode: updatedArguments.flow.changeMode } : {})
          }
        }

        if (sendMessage) {
          const formDataMessage = JSON.stringify(
            {
              action: 'form_submission',
              flow_name: data.flow_name || '',
              module_name: data.module_name || '',
              uuid: data.uuid || '',
              data: {
                flow: updatedArguments?.flow || {},
                ...(updatedArguments?.task ? { task: updatedArguments.task } : {})
              }
            },
            null,
            2
          )

          sendMessage(formDataMessage, [])

          // Mark form as submitted in localStorage for persistence across refreshes
          const formId = data.uuid || formKey
          markFormAsSubmitted(formId)

          setFormState(formKey, {
            isSubmitted: true,
            isCancelled: false,
            isLoading: false,
            isFlowCompleted: false,
            hasError: false
          })
          setUiState({
            isSubmitted: true,
            isCancelled: false,
            isLoading: false,
            isFlowCompleted: false,
            hasError: false
          })
        }
      } catch {
        setFormState(formKey, {
          isSubmitted: false,
          isCancelled: false,
          isLoading: false,
          isFlowCompleted: false,
          hasError: true
        })
        setUiState({
          isSubmitted: false,
          isCancelled: false,
          isLoading: false,
          isFlowCompleted: false,
          hasError: true
        })
      }
    },
    [formData, data, formKey, currentFormState, setFormState, sendMessage, objectKey, sourceType, markFormAsSubmitted]
  )

  const handleCancel = useCallback(() => {
    if (currentFormState.isCancelled || currentFormState.isLoading) {
      return
    }

    setFormState(formKey, {
      isSubmitted: false,
      isCancelled: true,
      isLoading: false,
      isFlowCompleted: false,
      hasError: false
    })
    setUiState({
      isSubmitted: false,
      isCancelled: true,
      isLoading: false,
      isFlowCompleted: false,
      hasError: false
    })

    if (sendMessage) {
      sendMessage('Cancel', [])
    }

    if (onCancel) onCancel()
  }, [currentFormState, formKey, setFormState, sendMessage, onCancel])

  useEffect(() => {
    return () => {
      if (currentFormState.isSubmitted || currentFormState.isCancelled) {
        setTimeout(() => {
          clearFormState(formKey)
        }, 5000)
      }
    }
  }, [formKey, currentFormState.isSubmitted, currentFormState.isCancelled, clearFormState])

  // Monitor conversation to detect flow completion or error after submission
  useEffect(() => {
    if (
      !currentFormState.isSubmitted ||
      currentFormState.isCancelled ||
      currentFormState.isFlowCompleted ||
      currentFormState.hasError
    ) {
      return
    }

    // Find the user turn where this form was submitted
    if (formSubmissionTurnIndexRef.current === -1) {
      const submissionTurnIndex = conversation.findIndex(turn => {
        if (turn.side === 'user') {
          try {
            const parsed = JSON.parse(turn.text || '')
            if (parsed?.action === 'form_submission' && parsed?.uuid === data.uuid) {
              return true
            }
          } catch {
            // Not a JSON submission
          }
        }
        return false
      })
      if (submissionTurnIndex !== -1) {
        formSubmissionTurnIndexRef.current = submissionTurnIndex
      }
    }

    if (formSubmissionTurnIndexRef.current >= 0) {
      const turnsAfter = conversation.slice(formSubmissionTurnIndexRef.current + 1)
      for (const turn of turnsAfter) {
        if (turn.side === 'agent' && 'outputs' in turn) {
          const hasError = turn.outputs.some(o => o.type === 'error')
          if (hasError) {
            const latest = getFormState(formKey)
            setFormState(formKey, { ...latest, hasError: true, isFlowCompleted: false })
            setUiState(prev => ({ ...prev, hasError: true, isFlowCompleted: false }))
            return
          }
          const hasAnswer = turn.outputs.some(o => o.type === 'answer')
          if (hasAnswer) {
            const latest = getFormState(formKey)
            setFormState(formKey, { ...latest, isFlowCompleted: true, hasError: false })
            setUiState(prev => ({ ...prev, isFlowCompleted: true, hasError: false }))
            return
          }
        }
      }
    }
  }, [conversation, currentFormState, formKey, data.uuid, getFormState, setFormState])

  const formatFlowName = (name: string): string => {
    if (!name) return ''
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const fields = useMemo(() => {
    if (!schema || !schema.properties) return []
    return Object.entries(schema.properties)
  }, [schema])

  // Read extracted fields from multiple hints
  const extractedFields = useMemo(() => {
    const fromSchema =
      (data?.flow_schema as any)?.['x-extractedFields'] || (data?.flow_schema as any)?.['x-extracted-fields']
    if (Array.isArray(fromSchema)) return fromSchema
    const fromArgs = (data?.arguments as any)?.meta?.extractedFields
    if (Array.isArray(fromArgs)) return fromArgs
    const fromUi = (data as any)?.ui?.extractedFields
    if (Array.isArray(fromUi)) return fromUi
    return [] as string[]
  }, [data])

  const decidePriority = useCallback(
    (fieldKey: string, fieldSchema: any): 'primary' | 'secondary' => {
      const uiP = fieldSchema?.['ui:priority']
      if (uiP === 'primary' || uiP === 'secondary') return uiP
      const xP = fieldSchema?.['x-priority']
      if (xP === 'primary' || xP === 'secondary') return xP
      if (extractedFields.includes(fieldKey)) return 'primary'
      return 'primary'
    },
    [extractedFields]
  )

  const [primaryFields, secondaryFields] = useMemo(() => {
    const primary: [string, any][] = []
    const secondary: [string, any][] = []
    for (const [k, s] of fields as [string, any][]) {
      ;(decidePriority(k, s) === 'primary' ? primary : secondary).push([k, s])
    }
    return [primary, secondary] as [Array<[string, any]>, Array<[string, any]>]
  }, [fields, decidePriority])

  const requiredFields = useMemo(() => schema?.required ?? [], [schema])

  const SecondaryCollapsible: React.FC<{
    fields: [string, any][]
    requiredFields: string[]
    isCompleted: boolean
    formData: Record<string, any>
    onFieldValueChange: (path: string, value: any) => void
    onFieldChange: (fieldName: string, value: any) => void
    accessToken: string
  }> = ({ fields, requiredFields, isCompleted, formData, onFieldValueChange, onFieldChange, accessToken }) => {
    const [open, setOpen] = useState(false)
    const hiddenMissingCount = useMemo(() => {
      return fields.reduce((acc, [fname]) => {
        if (requiredFields?.includes(fname)) {
          const v = (formData as any)[fname]
          if (v === '' || v === null || v === undefined) return acc + 1
        }
        return acc
      }, 0)
    }, [fields, requiredFields, formData])

    useEffect(() => {
      if (hiddenMissingCount > 0) setOpen(true)
    }, [hiddenMissingCount])

    if (fields.length === 0) return null
    return (
      <details
        open={open}
        onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}
        className={isCompleted ? 'gba:opacity-60 gba:pointer-events-none' : ''}
      >
        <summary className="gba:cursor-pointer gba:text-sm gba:font-medium gba:select-none gba:list-none gba:mb-2">
          Other fields
          {hiddenMissingCount > 0 && (
            <span className="gba:ml-2 gba:inline-flex gba:items-center gba:rounded-full gba:border gba:px-2 gba:py-0.5 gba:text-xs">
              Missing: {hiddenMissingCount}
            </span>
          )}
        </summary>
        <div className="gba:mt-3 gba:space-y-4">
          {fields.map(([fieldName, fieldSchema]) => (
            <SchemaField
              key={`s-${fieldName}`}
              name={fieldName}
              path=""
              schema={fieldSchema}
              required={requiredFields.includes(fieldName)}
              disabled={isCompleted}
              value={formData[fieldName]}
              onChange={value => onFieldChange(fieldName, value)}
              formData={formData}
              onFieldValueChange={onFieldValueChange}
              accessToken={accessToken}
            />
          ))}
        </div>
      </details>
    )
  }

  useEffect(() => {
    console.debug('[EveryAI][DynamicFormDisplay] schema', schema)
    console.debug('[EveryAI][DynamicFormDisplay] fields', fields)
    console.debug('[EveryAI][DynamicFormDisplay] formData', formData)
  }, [schema, fields, formData])

  const isSubmitted = currentFormState.isSubmitted || uiState.isSubmitted
  const isCancelled = currentFormState.isCancelled || uiState.isCancelled
  const isLoading = currentFormState.isLoading || uiState.isLoading
  const isFlowCompleted = currentFormState.isFlowCompleted || uiState.isFlowCompleted
  const hasError = currentFormState.hasError || uiState.hasError
  const isCompleted = isSubmitted || isCancelled

  // Track if we've registered this form for voice mode (prevents duplicate summaries)
  const voiceFormRegisteredRef = useRef<string | null>(null)

  // Store latest handlers in refs so they're always up-to-date without triggering re-registration
  const submitHandlerRef = useRef(() => {})
  const cancelHandlerRef = useRef(() => {})
  const updateFieldRef = useRef((_field: string, _value: any) => {})

  useEffect(() => {
    submitHandlerRef.current = () => {
      if (!currentFormState.isSubmitted && !currentFormState.isLoading && !submissionTriggeredRef.current) {
        console.log('[Voice] Submit handler triggered')
        submissionTriggeredRef.current = true // Prevent re-registration
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent
        handleSubmit(fakeEvent)
      }
    }
  }, [currentFormState.isSubmitted, currentFormState.isLoading, handleSubmit])

  useEffect(() => {
    cancelHandlerRef.current = () => {
      if (!currentFormState.isCancelled && !currentFormState.isLoading && !submissionTriggeredRef.current) {
        console.log('[Voice] Cancel handler triggered')
        submissionTriggeredRef.current = true // Prevent re-registration
        handleCancel()
      }
    }
  }, [currentFormState.isCancelled, currentFormState.isLoading, handleCancel])

  useEffect(() => {
    updateFieldRef.current = (fieldName: string, value: any) => {
      const normalizedSearch = fieldName.toLowerCase().replace(/\s+/g, '')
      const matchingField = fields.find(([key]) => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
        return normalizedKey === normalizedSearch || normalizedKey.includes(normalizedSearch)
      })
      if (matchingField) {
        // Update both state AND ref immediately
        // The ref update is critical because user might submit before React re-renders
        const newFormData = { ...formDataRef.current, [matchingField[0]]: value }
        formDataRef.current = newFormData
        setFormData(newFormData)
        console.log(`[Voice] Updated field "${matchingField[0]}" to "${value}"`)
        console.log('[Voice] formDataRef.current is now:', formDataRef.current)
        // Also keep the VoiceFormContext's active form snapshot in sync so the overlay reflects changes
        const ctx = voiceFormContextRef.current
        const currentUuid = data.uuid || formKey
        if (ctx?.activeForm?.uuid === currentUuid) {
          ctx.setActiveForm({
            ...ctx.activeForm,
            formData: newFormData
          })
        }
      } else {
        console.log(`[Voice] Could not find field matching "${fieldName}". Available fields:`, fields.map(f => f[0]))
      }
    }
  }, [fields])

  // Register form with voice context ONCE when entering voice mode
  // Store stable references to avoid effect re-runs
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Store voiceFormContext in a ref to avoid triggering effect re-runs
  const voiceFormContextRef = useRef(voiceFormContext)
  useEffect(() => {
    voiceFormContextRef.current = voiceFormContext
  }, [voiceFormContext])

  // Track if we've registered THIS form to prevent double registration
  const hasRegisteredThisFormRef = useRef(false)

  useEffect(() => {
    const formUuid = data.uuid || formKey
    const ctx = voiceFormContextRef.current

    // Wait for initial check to complete before registering
    if (!initialCheckComplete) {
      return
    }

    // Determine if we should be registered
    const shouldBeRegistered = isVoiceMode && ctx && !isCompleted && !submissionTriggeredRef.current

    if (shouldBeRegistered && !hasRegisteredThisFormRef.current) {
      // Register
      console.log('[Voice] ✅ Registering form:', formUuid)
      hasRegisteredThisFormRef.current = true
      voiceFormRegisteredRef.current = formUuid

      // Only set if different to avoid unnecessary provider updates
      if (ctx.activeForm?.uuid !== formUuid) {
        ctx.setActiveForm({
          uuid: formUuid,
          flowName: data.flow_name || 'Form',
          moduleName: data.module_name || '',
          data: dataRef.current,
          formData: formDataRef.current,
          submitHandler: () => submitHandlerRef.current(),
          cancelHandler: () => cancelHandlerRef.current(),
          updateField: (field, value) => updateFieldRef.current(field, value)
        })
      }
    } else if (!shouldBeRegistered && hasRegisteredThisFormRef.current) {
      // Unregister
      console.log('[Voice] Unregistering form:', formUuid)
      hasRegisteredThisFormRef.current = false
      voiceFormRegisteredRef.current = null
      // Only clear if we're the active one
      if (ctx?.activeForm?.uuid === formUuid) {
        ctx.setActiveForm(null)
      }
    }

    // Intentionally no cleanup here to avoid thrashing on re-renders.
    // We explicitly unregister above when conditions change, and on voice mode exit.
  }, [isVoiceMode, isCompleted, initialCheckComplete, data.uuid, formKey, data.flow_name, data.module_name])

  return (
    <Card
      className="gba:w-full gba:max-w-md gba:border-2 gba:shadow-xl gba:overflow-hidden"
      data-testid="dynamic-form-display"
    >
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg className="gba:h-5 gba:w-5 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <CardTitle className="gba:bg-gradient-to-r gba:from-primary gba:to-info gba:bg-clip-text gba:text-transparent">
            {formatFlowName(data.flow_name || '')}
          </CardTitle>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.module_name || ''}</p>
      </CardHeader>
      <CardContent className="gba:p-6">
        <form onSubmit={handleSubmit} className={isCompleted ? 'gba:opacity-60 gba:pointer-events-none' : ''}>
          <div className="gba:space-y-4">
            {/* PRIMARY fields first */}
            {primaryFields.map(([fieldName, fieldSchema]) => {
              if (fieldSchema == null || typeof fieldSchema !== 'object') {
                console.warn('[EveryAI][DynamicFormDisplay] skipping non-object schema field', fieldName, fieldSchema)
                return null
              }

              try {
                return (
                  <SchemaField
                    key={fieldName}
                    name={fieldName}
                    path=""
                    schema={fieldSchema}
                    required={schema.required?.includes(fieldName) || false}
                    disabled={isCompleted}
                    value={formData[fieldName]}
                    onChange={value => setFormData(prev => ({ ...prev, [fieldName]: value }))}
                    formData={formData}
                    onFieldValueChange={handleFieldValueChange}
                    accessToken={accessToken}
                  />
                )
              } catch (error) {
                console.error('[EveryAI][DynamicFormDisplay] failed to render field', fieldName, error)
                return (
                  <div key={`field-error-${fieldName}`} className="gba:text-sm gba:text-destructive">
                    Unable to render field "{fieldName}". Please contact support.
                  </div>
                )
              }
            })}
            {/* SECONDARY fields in collapsible */}
            {secondaryFields.length > 0 && (
              <SecondaryCollapsible
                fields={secondaryFields}
                requiredFields={requiredFields}
                isCompleted={isCompleted}
                formData={formData}
                onFieldValueChange={handleFieldValueChange}
                onFieldChange={(fieldName, value) => setFormData(prev => ({ ...prev, [fieldName]: value }))}
                accessToken={accessToken}
              />
            )}
          </div>

          {isFlowCompleted && (
            <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-success-secondary gba:to-success-secondary/50 gba:border-2 gba:border-success/30 gba:rounded-xl gba:shadow-lg">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                  <svg
                    className="gba:h-5 gba:w-5 gba:text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="gba:text-success gba:font-semibold">Form submitted successfully!</p>
              </div>
            </div>
          )}

          {hasError && (
            <div
              className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:rounded-xl gba:shadow-lg"
              data-testid="dynamic-form-error"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center">
                  <svg
                    className="gba:h-5 gba:w-5 gba:text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="gba:text-destructive gba:font-semibold">Form submission failed</p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:rounded-xl gba:shadow-lg">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center">
                  <svg
                    className="gba:h-5 gba:w-5 gba:text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="gba:text-destructive gba:font-semibold">Form cancelled</p>
              </div>
            </div>
          )}

          {!isCompleted && (
            <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6 gba:pt-4 gba:border-t-2 gba:border-border">
              <Button
                type="submit"
                className="gba:bg-gradient-to-r gba:from-success gba:to-success/80 hover:gba:shadow-lg gba:transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:h-4 gba:w-4 gba:border-2 gba:border-success-foreground gba:border-t-transparent gba:rounded-full gba:animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  className="hover:gba:shadow-lg gba:transition-all"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default React.memo<DynamicFormDisplayProps>(DynamicFormDisplay)
