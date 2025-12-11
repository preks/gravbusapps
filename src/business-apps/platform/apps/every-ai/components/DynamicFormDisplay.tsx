import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import type { FlowProposalOutput, ConversationTurn } from '../types/models'
import { useFormSubmission } from './FormSubmissionContext'
import { useVoiceFormContext } from '../context/VoiceFormContext'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { FormHeader, FormActions, FormStatusMessages, SchemaField, SecondaryCollapsible } from './forms'
import { formatFlowName } from './forms/utils/formSchemaUtils'

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
// SchemaField now includes ReactQuill support for markdown content types

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

  // Track the current form key to detect when a new form instance is mounted
  const previousFormKeyRef = useRef<string>(formKey)

  // Reset form state and refs when a new form instance is detected (different formKey)
  useEffect(() => {
    const currentFormKey = formKey
    const previousFormKey = previousFormKeyRef.current

    // If formKey changed, this is a new form instance - reset everything
    if (previousFormKey !== currentFormKey) {
      console.log('[DynamicFormDisplay] New form instance detected (formKey changed). Resetting state.')
      console.log('[DynamicFormDisplay] Previous formKey:', previousFormKey, 'Current formKey:', currentFormKey)

      // Reset all refs
      submissionTriggeredRef.current = false
      initialCheckDoneRef.current = false
      formSubmissionTurnIndexRef.current = -1
      setInitialCheckComplete(false)

      // Clear the previous form's state if it was submitted or cancelled
      const previousState = getFormState(previousFormKey)
      if (previousState.isSubmitted || previousState.isCancelled) {
        clearFormState(previousFormKey)
      }

      // Reset UI state to default
      setUiState({
        isSubmitted: false,
        isCancelled: false,
        isLoading: false,
        isFlowCompleted: false,
        hasError: false
      })
    }

    // Update the ref to track current formKey
    previousFormKeyRef.current = currentFormKey
  }, [formKey, clearFormState, getFormState])

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

  // Check if form was already submitted - runs when form UUID changes
  const initialSubmitCheckRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currentUuid = data.uuid
    // Only run check once per form UUID
    if (initialSubmitCheckRef.current === currentUuid) return
    initialSubmitCheckRef.current = currentUuid

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
  }, [data.uuid, formKey]) // Re-run when UUID changes (new form instance)

  // Track which form UUID we've checked to avoid re-checking the same form
  const checkedFormUuidRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currentUuid = data.uuid

    // If we already found a submission/cancellation for this specific form, don't re-check
    if (submissionTriggeredRef.current && checkedFormUuidRef.current === currentUuid) {
      if (!initialCheckComplete) setInitialCheckComplete(true)
      return
    }

    // If conversation is empty, we can still proceed with voice registration
    // (new forms won't be in conversation history anyway)
    if (conversation.length === 0) {
      console.log('[DynamicFormDisplay] Conversation empty - marking check complete for new form')
      setInitialCheckComplete(true)
      checkedFormUuidRef.current = currentUuid
      return
    }

    // If we've already checked this form UUID, skip
    if (checkedFormUuidRef.current === currentUuid && initialCheckComplete) return

    // Mark that we're checking this form UUID
    checkedFormUuidRef.current = currentUuid
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

        // Check for form submission or cancellation JSON
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
            // Match by UUID first (most reliable)
            // Only match by flow_name if NEITHER form has a UUID (both are new forms)
            const uuidMatch = parsed?.uuid && data.uuid && parsed.uuid === data.uuid
            const flowNameMatch =
              !parsed?.uuid && !data.uuid && parsed?.flow_name && data.flow_name && parsed.flow_name === data.flow_name
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
          if (parsed?.action === 'form_cancel') {
            console.log(
              '[DynamicFormDisplay] Found form_cancel at turn:',
              i,
              'uuid:',
              parsed?.uuid,
              'flow_name:',
              parsed?.flow_name
            )
            // Only match if UUID matches THIS specific form
            // If both forms have UUIDs, require exact UUID match (prevents matching different form instances)
            const uuidMatch = parsed?.uuid && data.uuid && parsed.uuid === data.uuid

            // Only match by flow_name if NEITHER form has a UUID (both are new forms)
            // This prevents matching a canceled form with UUID to a new form without UUID
            const flowNameMatch =
              !parsed?.uuid && !data.uuid && parsed?.flow_name && data.flow_name && parsed.flow_name === data.flow_name

            if (uuidMatch || flowNameMatch) {
              console.log('[DynamicFormDisplay] MATCH! Form was cancelled (matched by uuid or flow_name).')
              foundCancellation = true
            } else {
              console.log(
                '[DynamicFormDisplay] Ignoring form_cancel - does not match this form (this form uuid:',
                data.uuid,
                'flow_name:',
                data.flow_name,
                ')'
              )
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
      const flowDisplayName = formatFlowName(data.flow_name || 'Form')
      const cancelMessage = JSON.stringify({
        action: 'form_cancel',
        flow_name: data.flow_name || '',
        uuid: data.uuid || '',
        userMessage: `Cancelled: ${flowDisplayName}`
      })
      sendMessage(cancelMessage, [])
    }

    if (onCancel) onCancel()
  }, [currentFormState, formKey, setFormState, sendMessage, onCancel, data.flow_name, data.uuid])

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

  // Detect operation type from root level operation field (defaults to 'create' if not set)
  const operation = data.operation || 'create'
  const isDeleteOperation = operation === 'delete'

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

    const entityDataFromFlow = (data as any).entity_data

    // For delete operations, use ONLY entity_data (not GraphQL since item is already deleted)
    if (!entityDataFromFlow) return null

    // Extract entity type from entity_data (check both 'entity' and 'entity_name' fields)
    const entityTypeFromData = entityDataFromFlow.entity || entityDataFromFlow.entity_name
    if (!entityTypeFromData) return null

    // Convert snake_case to camelCase for entity type mapping (e.g., "content_entry" -> "contentEntry")
    const camelCaseEntityType = entityTypeFromData
      .split('_')
      .map((word: string, index: number) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join('')

    const entityId = entityDataFromFlow.id
    if (!entityId) return null

    // Extract display fields - use text_title from entity_data
    const summary: Array<{ label: string; value: string }> = []
    if (entityDataFromFlow.text_title) {
      summary.push({ label: 'Title', value: entityDataFromFlow.text_title })
    }

    // Build entity URL
    const entityUrl = buildEntityUrl(camelCaseEntityType, entityId)

    return {
      entityType: camelCaseEntityType.replace(/([A-Z])/g, ' $1').trim(),
      entityId,
      entityUrl,
      fields: summary
    }
  }, [isDeleteOperation, buildEntityUrl, data])

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

  // Handle card click to navigate to entity page
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking on form elements or buttons
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('form')
      ) {
        return
      }

      // Only navigate for delete operations with entity URL
      if (isDeleteOperation && deleteSummary?.entityUrl) {
        navigateTo(deleteSummary.entityUrl)
      }
    },
    [isDeleteOperation, deleteSummary]
  )

  return (
    <Card
      className={`gba:w-full gba:max-w-md gba:border-2 gba:shadow-xl gba:overflow-hidden ${
        isDeleteOperation && deleteSummary?.entityUrl
          ? 'gba:cursor-pointer hover:gba:shadow-2xl gba:transition-shadow'
          : ''
      }`}
      data-testid="dynamic-form-display"
      onClick={isDeleteOperation && deleteSummary?.entityUrl ? handleCardClick : undefined}
    >
      <FormHeader flowName={data.flow_name || ''} isDeleteOperation={isDeleteOperation} operation={operation} />
      <CardContent className="gba:p-4">
        <form onSubmit={handleSubmit} className={isCompleted ? 'gba:opacity-60 gba:pointer-events-none' : ''}>
          {isDeleteOperation && deleteSummary ? (
            // Simplified delete confirmation UI
            <div className="gba:space-y-3">
              {deleteSummary.fields.length > 0 && (
                <div className="gba:space-y-2">
                  {deleteSummary.fields.map((field, idx) => (
                    <div key={idx} className="gba:flex gba:gap-2">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{field.label}:</span>
                      <span className="gba:text-sm gba:text-foreground">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {deleteSummary.entityUrl && (
                <div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      navigateTo(deleteSummary.entityUrl!)
                    }}
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
