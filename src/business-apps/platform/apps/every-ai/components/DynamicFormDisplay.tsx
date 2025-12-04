import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import type { FlowProposalOutput, ConversationTurn } from '../types/models'
import { useFormSubmission } from './FormSubmissionContext'
import { useVoiceFormContext } from '../context/VoiceFormContext'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { FormHeader, FormActions, FormStatusMessages, SchemaField, SecondaryCollapsible } from './forms'
import { extractOperation } from './forms/utils/formSchemaUtils'

interface DynamicFormDisplayProps {
  data: FlowProposalOutput
  onCancel?: () => void
  sendMessage?: (message: string, files: File[]) => void
  conversation?: ConversationTurn[]
  accessToken: string
  isVoiceMode?: boolean
}

// SchemaField, SearchableUuidField, and SecondaryCollapsible have been moved to ./forms/
// All old component definitions have been removed - they are now imported from ./forms

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
            console.log(
              '[DynamicFormDisplay] Found form_submission at turn:',
              i,
              'uuid:',
              parsed?.uuid,
              'flow_name:',
              parsed?.flow_name
            )
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

  // Detect operation type from root level
  const operation = extractOperation(data.flow_name || '')
  const isDeleteOperation = operation === 'Delete'

  // Helper function to build entity URL based on entity type
  const buildEntityUrl = useCallback((entityType: string, entityId: string): string | null => {
    if (!entityId) return null

    // Map entity types to their platform URLs
    const entityUrlMap: Record<string, { path: string; param: string }> = {
      contentEntry: { path: '/platform/content/intranet/content-record', param: 'contentId' },
      lead: { path: '/platform/crm/lead-record', param: 'leadId' },
      contact: { path: '/platform/crm/contact-record', param: 'contactId' },
      account: { path: '/platform/crm/account-record', param: 'accountId' },
      opportunity: { path: '/platform/crm/opportunity-record', param: 'opportunityId' },
      employee: { path: '/platform/employee-record', param: 'employeeId' },
      investmentLead: { path: '/platform/irm/lead-record', param: 'leadId' },
      investmentContact: { path: '/platform/irm/contact-record', param: 'contactId' },
      investmentAccount: { path: '/platform/irm/account-record', param: 'accountId' },
      investmentOpportunity: { path: '/platform/irm/opportunity-record', param: 'opportunityId' }
    }

    const urlConfig = entityUrlMap[entityType]
    if (!urlConfig) return null

    return buildPlatformUrl(urlConfig.path, { [urlConfig.param]: entityId })
  }, [])

  // Extract summary for delete operations
  const deleteSummary = useMemo(() => {
    if (!isDeleteOperation) return null

    const flowData = data.arguments?.flow || {}
    const taskData = data.arguments?.task || {}

    // Find the main entity object (similar to initialValues extraction)
    const findEntityObject = (obj: Record<string, any>): any => {
      for (const [key, value] of Object.entries(obj)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          !['changeMode', 'id', 'version', 'businessKey', 'meta', 'reason'].includes(key)
        ) {
          return { key, value }
        }
      }
      return null
    }

    const taskEntity = findEntityObject(taskData)
    const flowEntity = findEntityObject(flowData)

    const entity = taskEntity || flowEntity
    if (!entity) return null

    const entityData = entity.value
    const entityType = entity.key
    const entityId = entityData.id

    // Extract display fields
    const summary: Array<{ label: string; value: string }> = []

    // Common fields to extract
    if (entityData.title) summary.push({ label: 'Title', value: entityData.title })
    if (entityData.name) summary.push({ label: 'Name', value: entityData.name })
    if (entityData.firstName && entityData.lastName) {
      summary.push({ label: 'Name', value: `${entityData.firstName} ${entityData.lastName}`.trim() })
    } else if (entityData.firstName) summary.push({ label: 'First Name', value: entityData.firstName })
    else if (entityData.lastName) summary.push({ label: 'Last Name', value: entityData.lastName })
    if (entityData.email) summary.push({ label: 'Email', value: entityData.email })
    if (entityData.id) summary.push({ label: 'ID', value: entityData.id.substring(0, 8) + '...' })

    // Build entity URL
    const entityUrl = buildEntityUrl(entityType, entityId)

    return {
      entityType: entityType.replace(/([A-Z])/g, ' $1').trim(),
      entityId,
      entityUrl,
      fields: summary
    }
  }, [isDeleteOperation, data.arguments, buildEntityUrl])

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
  const updateFieldRef = useRef<(fieldName: string, value: any) => void>(() => {})

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
        console.log(
          `[Voice] Could not find field matching "${fieldName}". Available fields:`,
          fields.map(f => f[0])
        )
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
      className={`gba:w-full gba:max-w-md gba:border-2 gba:shadow-xl gba:overflow-hidden ${
        isDeleteOperation ? 'gba:border-destructive/50' : ''
      }`}
      data-testid="dynamic-form-display"
    >
      <FormHeader
        flowName={data.flow_name || ''}
        moduleName={data.module_name || ''}
        isDeleteOperation={isDeleteOperation}
      />
      <CardContent className="gba:p-6">
        <form onSubmit={handleSubmit} className={isCompleted ? 'gba:opacity-60 gba:pointer-events-none' : ''}>
          {isDeleteOperation && deleteSummary ? (
            // Simplified delete confirmation UI
            <div className="gba:space-y-4">
              <div className="gba:p-4 gba:bg-destructive-secondary/20 gba:border gba:border-destructive/30 gba:rounded-lg">
                <p className="gba:text-sm gba:font-semibold gba:text-destructive gba:mb-3">
                  Are you sure you want to delete this {deleteSummary.entityType}?
                </p>
                <div className="gba:space-y-2">
                  {deleteSummary.fields.map((field, idx) => (
                    <div key={idx} className="gba:flex gba:gap-2">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{field.label}:</span>
                      <span className="gba:text-sm gba:text-foreground">{field.value}</span>
                    </div>
                  ))}
                </div>
                {deleteSummary.entityUrl && (
                  <div className="gba:mt-4 gba:pt-3 gba:border-t gba:border-destructive/20">
                    <button
                      type="button"
                      onClick={() => navigateTo(deleteSummary.entityUrl!)}
                      className="gba:inline-flex gba:items-center gba:gap-2 gba:text-sm gba:text-primary hover:gba:text-primary/80 gba:underline gba:transition-colors"
                    >
                      <svg className="gba:h-4 gba:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      <span>View original {deleteSummary.entityType}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Regular form with all fields
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
          )}

          <FormStatusMessages isFlowCompleted={isFlowCompleted} hasError={hasError} isCancelled={isCancelled} />

          {!isCompleted && (
            <FormActions
              isDeleteOperation={isDeleteOperation}
              isLoading={isLoading}
              onCancel={onCancel ? handleCancel : undefined}
            />
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default React.memo<DynamicFormDisplayProps>(DynamicFormDisplay)
