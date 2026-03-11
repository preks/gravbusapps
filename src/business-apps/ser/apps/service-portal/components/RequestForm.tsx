import React, { useState, useMemo } from 'react'
import {
  PageLayout,
  Card,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  Badge,
  Spinner,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  type KpiCardData
} from '@newwork/nw-design-system'
import { WorkflowEngine, FlowTemplate } from '../../../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DateTimeField } from '../../../components/DateTimeField'
import { FileUploadField } from '../../../components/FileUploadField'
import { NumberField } from '../../../components/NumberField'
import type { UploadFile } from '../../../components/FileUploadField'
import { serializeUploadResults } from '../../../utils/fileUploadUtils'
import { useServiceFileUpload } from '../../../hooks/useServiceFileUpload'
import {
  FileTextIcon,
  CheckCircleIcon,
  UsersIcon,
  WarningIcon,
  SparkleIcon,
  UserIcon,
  RobotIcon,
  BrainIcon,
  CopyIcon,
  ThumbsUpIcon,
  LightbulbIcon,
  TargetIcon,
  ShieldCheckIcon
} from '@phosphor-icons/react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { getCategoryIcon } from '../../../utils/iconMapping'
import { useRealEmployeeData, getEmployeeOptions } from '../hooks/useRealEmployeeData'
import { parseMarkdownForReact } from '@/common/utils/markdownUtils'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { DataSourceSelect } from './DataSourceSelect'
import { DataSourceMultiSelect } from './DataSourceMultiSelect'
import { MessageRenderer } from '../../../components/MessageRenderer'

export interface RequestFormProps extends BusinessAppContextProps {
  flowTemplate: FlowTemplate
  workflowEngine: WorkflowEngine
  onSuccess: (requestId: string) => void
  onCancel: () => void
}

// FormField component removed - only using dynamic form generation from flow templates

// ProcessStepPreview component removed - only using flow template steps preview
// MultiSelect component removed - now using DataSourceMultiSelect for all multiselect fields
// FileUpload component removed - not currently used in this form

export const RequestForm: React.FC<RequestFormProps> = ({
  flowTemplate,
  workflowEngine,
  onSuccess,
  onCancel,
  ...contextProps
}) => {
  // Check URL query parameter to show first step assignment (for debugging)
  const [showFirstStepAssignment] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('showFirstStepAssignment') === 'true'
    }
    return false
  })
  const [formData, setFormData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [error, setError] = useState<{ message: string; payload?: any } | null>(null)
  const [stepsRequiringAssignment, setStepsRequiringAssignment] = useState<
    Array<{
      stepId: string
      stepIndex: number
      title: string
      assignmentMode: string
      requiresUsers: boolean
    }>
  >([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // AI Response Modal State
  const [showAIResponse, setShowAIResponse] = useState(false)
  const [aiResponse, setAIResponse] = useState<string>('')
  const [aiLoading, setAILoading] = useState(false)
  const [aiResponseType, setAIResponseType] = useState<'suggestion' | 'validation' | 'optimization'>('suggestion')

  // Only using flow templates now
  const currentTemplate = flowTemplate

  // 🌐 UNIVERSAL: Load steps requiring assignment for any template
  React.useEffect(() => {
    const loadRequiredAssignments = async () => {
      if (!flowTemplate?.id || !workflowEngine.getStepsRequiringAssignment) {
        setStepsRequiringAssignment([])
        return
      }

      setLoadingAssignments(true)
      try {
        const requiredSteps = await workflowEngine.getStepsRequiringAssignment(flowTemplate.id)
        setStepsRequiringAssignment(requiredSteps)

        // Initialize step assignment form fields
        if (requiredSteps.length > 0) {
          const initialAssignments: any = { stepAssignments: {} }
          requiredSteps.forEach(step => {
            // Set assignment mode and allowReassignment from template
            initialAssignments[`${step.stepId}_assignmentMode`] = step.assignmentMode
            initialAssignments[`${step.stepId}_allowReassignment`] = step.assignmentMode !== 'ASSIGN'

            // 🎯 SERVICE PORTAL: Auto-assign ASSIGN mode steps to current user
            if (step.assignmentMode === 'ASSIGN') {
              initialAssignments.stepAssignments[step.stepId] = contextProps.userInfo?.id || 'current-user'
            }
          })
          setFormData((prev: any) => ({ ...prev, ...initialAssignments }))
        }

        console.log(`[RequestForm] 🔍 Template ${flowTemplate.id} requires assignments for:`, requiredSteps)
      } catch (error) {
        console.error('[RequestForm] Error loading required assignments:', error)
        setStepsRequiringAssignment([])
      } finally {
        setLoadingAssignments(false)
      }
    }

    loadRequiredAssignments()
  }, [flowTemplate?.id, workflowEngine])

  if (!currentTemplate) {
    return (
      <Alert variant="destructive" className="gba:mb-4" style={{ display: 'block' }}>
        <WarningIcon className="gba:h-4 gba:w-4" />
        <h4 className="gba:font-semibold">Invalid Template</h4>
        <div
          style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }}
          className="gba:text-sm gba:mt-2"
        >
          No valid template provided for this request form.
        </div>
      </Alert>
    )
  }

  // Load real employee data
  const { employees, isLoading: dataLoading, error: dataError } = useRealEmployeeData(contextProps)

  // Initialize file upload hook
  const { uploadFiles } = useServiceFileUpload({
    accessToken: contextProps.accessToken,
    onSuccess: results => {
      console.log('🔍 [RequestForm] File upload completed:', results)
    },
    onError: error => {
      console.error('🔍 [RequestForm] File upload error:', error)
    }
  })

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))

    // 🌐 UNIVERSAL: Handle step assignment changes
    if (field.startsWith('stepAssignment_')) {
      const stepId = field.replace('stepAssignment_', '')
      setFormData((prev: any) => ({
        ...prev,
        stepAssignments: {
          ...prev.stepAssignments,
          [stepId]: value
        }
      }))
    }
  }

  // Get category and icon for flow template
  const category = { id: 'flow-templates', name: 'Flow Template', description: 'Dynamic workflow template' }
  const IconComponent = getCategoryIcon(category.id) || FileTextIcon

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setIsLoading(true)
    setError(null)

    // Build complete payload for debugging
    let completePayload: any = {}
    const finalFormData = { ...formData }

    try {
      // Step 1: Check if there are any file fields with files to upload
      const fileFields = flowTemplate?.formSchema?.filter(field => field.type?.toUpperCase() === 'FILE') || []
      const filesToUpload: { fieldName: string; files: File[] }[] = []

      for (const field of fileFields) {
        const fieldValue = formData[field.name]
        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
          // Extract actual File objects from UploadFile array
          const files = fieldValue
            .filter((uploadFile: UploadFile) => uploadFile.originFileObj instanceof File)
            .map((uploadFile: UploadFile) => uploadFile.originFileObj!)

          if (files.length > 0) {
            filesToUpload.push({ fieldName: field.name, files })
          }
        }
      }

      // Step 2: Upload files if any exist
      if (filesToUpload.length > 0) {
        setIsUploadingFiles(true)
        setUploadProgress('Preparing file uploads...')

        // Calculate total file size for validation
        const totalFileSize = filesToUpload.reduce((total, { files }) => {
          return total + files.reduce((sum, file) => sum + file.size, 0)
        }, 0)

        // Validate total file size (e.g., 100MB limit for all files combined)
        const MAX_TOTAL_SIZE = 100 * 1024 * 1024 // 100MB
        if (totalFileSize > MAX_TOTAL_SIZE) {
          throw new Error(
            `Total file size (${(totalFileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${MAX_TOTAL_SIZE / 1024 / 1024}MB)`
          )
        }

        try {
          for (const { fieldName, files } of filesToUpload) {
            setUploadProgress(
              `Uploading files for ${fieldName}... (${files.length} file${files.length > 1 ? 's' : ''})`
            )

            try {
              // Generate a temporary request ID for file organization
              // Note: Files will be in temp folder until workflow moves them to permanent location
              const tempRequestId = `temp/${Date.now()}`

              // Upload files for this field
              const uploadResults = await uploadFiles(files, tempRequestId)

              // Validate upload results
              if (!uploadResults || uploadResults.length === 0) {
                throw new Error('File upload completed but no results were returned')
              }

              if (uploadResults.length !== files.length) {
                console.warn(
                  `⚠️ [RequestForm] Upload count mismatch for ${fieldName}: expected ${files.length}, got ${uploadResults.length}`
                )
              }

              // Serialize and store upload results directly in the original field
              const serializedResults = serializeUploadResults(uploadResults)
              finalFormData[fieldName] = serializedResults

              console.log(
                `✅ [RequestForm] Uploaded ${uploadResults.length} file(s) for ${fieldName}:`,
                serializedResults
              )
            } catch (uploadErr) {
              // Provide detailed error information for debugging
              const errorDetails = uploadErr instanceof Error ? uploadErr.message : 'Unknown error'
              console.error(`❌ [RequestForm] Upload failed for ${fieldName}:`, uploadErr)

              throw new Error(`Failed to upload files for field "${fieldName}": ${errorDetails}`)
            }
          }

          setUploadProgress('Files uploaded successfully!')
          console.log('✅ [RequestForm] All files uploaded successfully')
        } finally {
          setIsUploadingFiles(false)
        }
      }

      // Step 3: Submit the form with upload results
      if (flowTemplate) {
        // For flow templates, we need to execute the template with the form data
        // The workflowEngine should have a method to execute templates by ID
        if (typeof workflowEngine.executeTemplate === 'function') {
          // Build the actual API payload that will be sent to custom-flow-engine
          // Debug: Log the complete form data before submission
          console.log('🔍 [RequestForm] Complete form data before submission:', finalFormData)

          // Debug: Log file upload results specifically
          fileFields.forEach(field => {
            if (finalFormData[field.name] && Array.isArray(finalFormData[field.name])) {
              console.log(`🔍 [RequestForm] File upload results for ${field.name}:`, finalFormData[field.name])
              console.log(
                `🔍 [RequestForm] File upload results stringified:`,
                JSON.stringify(finalFormData[field.name], null, 2)
              )
            }
          })

          completePayload = {
            apiEndpoint: `POST /api/templates/${flowTemplate.id || flowTemplate.name}/execute`,
            expectedCustomFlowEnginePayload: {
              initiatorId: contextProps.userInfo?.id || 'unknown-user',
              input: finalFormData,
              correlationId: `REQ-${Date.now()}`
            },
            actualPayloadSent: 'Will be logged by ConductorWorkflowEngineAdapter',
            formData: finalFormData,
            templateInfo: {
              id: flowTemplate.id,
              name: flowTemplate.name,
              description: flowTemplate.description
            }
          }
          const newRequestId = await workflowEngine.executeTemplate(flowTemplate.id || flowTemplate.name, finalFormData)
          onSuccess(newRequestId)
        } else {
          // Fallback to startRequest with template name as key
          completePayload = {
            apiEndpoint: `POST /api/templates/${flowTemplate.id || flowTemplate.name}/execute`,
            expectedCustomFlowEnginePayload: {
              initiatorId: contextProps.userInfo?.id || 'unknown-user',
              input: finalFormData,
              correlationId: `REQ-${Date.now()}`
            },
            actualPayloadSent: 'Check browser console for ConductorWorkflowEngineAdapter logs',
            formData: finalFormData,
            templateInfo: {
              id: flowTemplate.id,
              name: flowTemplate.name,
              description: flowTemplate.description
            }
          }
          const newRequestId = await workflowEngine.startRequest(flowTemplate.name, finalFormData)
          onSuccess(newRequestId)
        }
      } else {
        throw new Error('No valid flow template provided')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request'

      // Check if this is an enhanced error from ConductorWorkflowEngineAdapter with actual payload
      const actualPayload = (err as any)?.debugPayload || null

      setError({
        message: errorMessage,
        payload: actualPayload || completePayload // Use actual payload if available, fallback to mock
      })

      // Note: If files were uploaded but form submission failed, files remain in temp folder
      // Backend should have a cleanup job to remove temp files older than X hours/days
      // Or workflow engine should move temp files to permanent location on successful workflow start
      if (isUploadingFiles || uploadProgress) {
        console.warn('⚠️ [RequestForm] Form submission failed after file upload. Files may remain in temp folder.')
      }
    } finally {
      setIsLoading(false)
      setIsUploadingFiles(false)
      setUploadProgress('')
    }
  }

  // No more form field configuration needed - only using dynamic flow templates

  // Future: Could implement multi-step form here

  // KPI cards for the form
  const kpiCards: KpiCardData[] = useMemo(() => {
    const stepCount = flowTemplate?.stepCount || flowTemplate?.steps?.length || 0
    const estimatedTime = flowTemplate?.estimatedDuration || `${stepCount}-${stepCount * 2} days`

    return [
      {
        id: 'processing-steps',
        title: 'Processing Steps',
        value: stepCount,
        description: 'Workflow stages'
      },
      {
        id: 'estimated-time',
        title: 'Est. Completion',
        value: estimatedTime,
        description: 'Business days'
      },
      {
        id: 'template-type',
        title: 'Template Type',
        value: 'Live',
        description: 'Workflow engine'
      },
      {
        id: 'success-rate',
        title: 'Success Rate',
        value: '98%',
        description: 'Completion rate'
      }
    ]
  }, [flowTemplate])

  // Calculate form completion percentage (including step assignments)
  const completionPercentage = useMemo(() => {
    let totalRequired = 0
    let completedRequired = 0

    // Only handle flow templates - no more mock templates
    if (flowTemplate?.formSchema) {
      totalRequired = flowTemplate.formSchema.filter(f => f.required).length
      completedRequired = flowTemplate.formSchema.filter(f => {
        if (!f.required) return false

        const value = formData[f.name]

        // Handle file fields - consider filled if at least one file is selected
        if (f.type?.toUpperCase() === 'FILE') {
          return Array.isArray(value) && value.length > 0
        }

        // Handle other field types
        return value !== undefined && value !== ''
      }).length
    }

    // 🌐 UNIVERSAL: Add step assignments to completion calculation
    if (stepsRequiringAssignment.length > 0) {
      // Filter out first step (always assigned to initiator) unless query param is set
      const visibleSteps = stepsRequiringAssignment.filter(step => showFirstStepAssignment || step.stepIndex !== 0)

      const claimStepsRequiringInput = visibleSteps.filter(step => step.assignmentMode === 'CLAIM')

      // Only count CLAIM steps as requiring user input (ASSIGN steps are auto-completed)
      totalRequired += claimStepsRequiringInput.length

      const completedClaimAssignments = claimStepsRequiringInput.filter(
        step => formData.stepAssignments?.[step.stepId]
      ).length
      completedRequired += completedClaimAssignments

      // ASSIGN steps are automatically completed (assigned to current user)
    }

    return totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : totalRequired === 0 ? 100 : 0
  }, [flowTemplate, formData, stepsRequiringAssignment, showFirstStepAssignment])

  // Handle AI button click - collect form data and call real AI API
  const handleAskAI = async () => {
    console.log('🤖 [Ask AI for Quick Solution] Button clicked')

    // Start AI loading
    setAILoading(true)
    setShowAIResponse(true)
    setError(null)

    // Prepare AI payload with form data for the ticket_data structure
    const ticketData = {
      timestamp: new Date().toISOString(),
      templateInfo: {
        type: 'flow-template',
        id: flowTemplate?.id,
        name: flowTemplate?.name,
        description: currentTemplate?.description
      },
      formData: { ...formData },
      formCompletion: {
        percentage: completionPercentage,
        totalFields: flowTemplate?.formSchema?.length || 0,
        filledFields: Object.keys(formData).filter(key => {
          const value = formData[key]
          // Handle file fields
          if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
            return true
          }
          // Handle other field types
          return value !== undefined && value !== ''
        }).length
      },
      stepAssignments: formData.stepAssignments || {},
      requiredAssignments: stepsRequiringAssignment.map(step => ({
        stepId: step.stepId,
        title: step.title,
        assignmentMode: step.assignmentMode,
        assignedTo:
          formData.stepAssignments?.[step.stepId] || (step.assignmentMode === 'ASSIGN' ? 'current-user' : 'unassigned')
      })),
      userContext: {
        userId: contextProps.userInfo?.id,
        employeeId: contextProps.userInfo?.employeeId,
        fullName: contextProps.userInfo?.fullName,
        email: contextProps.userInfo?.email
      },
      aiRequestContext: {
        purpose: 'quick-solution-suggestion',
        expectedResponse:
          'AI should analyze the form data and suggest optimizations, missing fields, or quick solutions'
      }
    }

    console.log('🤖 [Ask AI] Prepared payload for AI service:', ticketData)

    try {
      // Call the real AI API using direct fetch (like EveryAI)
      const baseUrl = resolveFlowbotBaseUrl()
      const url = `${baseUrl}/flowbot/services/quick-tips-for-ticket/`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contextProps.accessToken}`
        },
        body: JSON.stringify({ ticket_data: ticketData })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const response = await res.json()

      console.log('🤖 [Ask AI] API Response:', response)

      // Process the response and determine type based on content
      let responseText = ''
      let responseType: 'suggestion' | 'validation' | 'optimization' = 'suggestion'

      // Extract text from response - prioritize "quick_tips" field
      if (response && typeof response === 'object' && 'quick_tips' in response) {
        responseText = response.quick_tips as string
      } else if (typeof response === 'string') {
        responseText = response
      } else if (response.suggestions) {
        responseText = response.suggestions
      } else if (response.analysis) {
        responseText = response.analysis
      } else if (response.recommendations && Array.isArray(response.recommendations)) {
        responseText = response.recommendations.join('\n\n')
      } else {
        // Fallback: stringify the entire response
        responseText = JSON.stringify(response, null, 2)
      }

      // Determine response type based on content or form completion
      if (completionPercentage < 50) {
        responseType = 'validation'
      } else if (completionPercentage >= 100) {
        responseType = 'optimization'
      } else {
        responseType = 'suggestion'
      }

      setAIResponse(responseText || 'AI analysis completed. No specific recommendations at this time.')
      setAIResponseType(responseType)

      console.log('🤖 [Ask AI] Processed response:', {
        responseType,
        completionPercentage,
        responseLength: responseText.length
      })
    } catch (err) {
      console.error('🤖 [Ask AI] API Error:', err)

      // Fallback to informative error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setAIResponse(`❌ **AI Service Temporarily Unavailable**

We're unable to connect to the AI service right now. This might be due to:

• Network connectivity issues
• Service maintenance
• Authentication problems

**Manual Suggestions:**
• Form completion: ${completionPercentage}%
• ${completionPercentage < 100 ? 'Complete all required fields before submitting' : 'Your form appears complete and ready for submission'}
• Add detailed business justification to speed up approval
• Include any relevant deadlines or urgency information

**Error Details:** ${errorMessage}

Please try again in a few moments, or proceed with submitting your request.`)
      setAIResponseType('validation')

      // Also set the error state for debugging
      setError({
        message: `AI Service Error: ${errorMessage}`,
        payload: {
          apiCall: {
            endpoint: 'POST /flowbot/services/quick-tips-for-ticket/',
            baseUrl: resolveFlowbotBaseUrl()
          },
          error: errorMessage,
          ticketData
        }
      })
    } finally {
      setAILoading(false)
    }
  }

  return (
    <div data-testid="request-form-container" className="gba:bg-background gba:p-4">
      {/* Back navigation */}
      <div className="gba:back-navigation gba:mb-4">
        <button
          type="button"
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }}
          disabled={isLoading}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
          data-testid="back-button"
        >
          <ArrowLeftIcon size={16} className="gba:mr-2" />
          <span>Cancel Request</span>
        </button>
      </div>

      <PageLayout
        headerPhosphorIcon={{
          icon: IconComponent,
          variant: 'strategy',
          size: 'lg',
          label: currentTemplate?.name || 'Service Request'
        }}
        headerTitle={`Request: ${currentTemplate?.name || 'Service Request'}`}
        headerDescription={currentTemplate?.description || 'Complete the form below to submit your service request'}
        sectionTitle="Service Request Form"
        sectionDescription={`Fill out the required information to submit your ${currentTemplate?.name?.toLowerCase() || 'service request'}`}
        kpiCardsData={kpiCards}
      >
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8">
          {/* Main Form Column */}
          <div className="gba:lg:col-span-2 gba:space-y-6">
            {error && (
              <Alert variant="destructive" className="gba:mb-4" style={{ display: 'block' }}>
                <WarningIcon className="gba:h-4 gba:w-4" />
                <h4 className="gba:font-semibold">Request Failed</h4>
                <div
                  style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }}
                  className="gba:text-sm gba:mt-2"
                >
                  <strong>Error:</strong> {error.message}
                </div>
                {error.payload && (
                  <div className="gba:mt-4 gba:space-y-4">
                    <div className="gba:text-xs gba:font-semibold gba:text-gray-700">
                      {error.payload.sentPayload
                        ? '🎯 ACTUAL API Debug Info (from ConductorWorkflowEngineAdapter):'
                        : '🔍 API Debug Info (Development):'}
                    </div>

                    {/* 1. API Call Information */}
                    {error.payload.apiCall && (
                      <div className="gba:p-3 gba:bg-blue-50 gba:rounded gba:border gba:border-blue-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-blue-800 gba:mb-2">
                          🌐 1. API Call Information
                        </div>
                        <pre className="gba:text-xs gba:text-blue-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.apiCall, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* 2. Sent Payload */}
                    {error.payload.sentPayload && (
                      <div className="gba:p-3 gba:bg-green-50 gba:rounded gba:border gba:border-green-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-green-800 gba:mb-2">
                          📦 2. Sent Payload to Custom Flow Engine
                        </div>
                        <pre className="gba:text-xs gba:text-green-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.sentPayload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* 3. Response Information */}
                    {error.payload.response && (
                      <div className="gba:p-3 gba:bg-red-50 gba:rounded gba:border gba:border-red-200">
                        <div className="gba:text-xs gba:font-semibold gba:text-red-800 gba:mb-2">
                          📤 3. Response from Custom Flow Engine
                        </div>
                        <pre className="gba:text-xs gba:text-red-700 gba:whitespace-pre-wrap gba:font-mono gba:overflow-x-auto">
                          {JSON.stringify(error.payload.response, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="gba:text-xs gba:text-blue-600 gba:bg-blue-50 gba:p-2 gba:rounded">
                      {error.payload.sentPayload ? (
                        <span>
                          ✅ <strong>These show the EXACT API call data!</strong> Compare with browser network tab -
                          each section matches the corresponding network request parts.
                        </span>
                      ) : (
                        <span>
                          💡 <strong>Tip:</strong> Check browser console for ConductorWorkflowEngineAdapter logs to see
                          the actual data sent to custom-flow-engine
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Alert>
            )}

            {/* Progress Indicator */}
            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center">
                  <CheckCircleIcon className="gba:mr-2 gba:text-primary" />
                  Form Progress
                </h3>
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {completionPercentage}% Complete
                </span>
              </div>
              <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2">
                <div
                  className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all gba:duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </Card>

            {/* Request Form */}
            <Card className="gba:p-8">
              <form onSubmit={handleSubmit} className="gba:space-y-8">
                {/* Show loading state for data */}
                {dataLoading && !dataError && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:p-8">
                    <Spinner size="sm" className="gba:mr-3" />
                    <span className="gba:text-sm gba:text-muted-foreground">Loading form data...</span>
                  </div>
                )}

                {/* Show data error */}
                {dataError && (
                  <Alert variant="destructive" className="gba:mb-6" style={{ display: 'block' }}>
                    <WarningIcon className="gba:h-4 gba:w-4" />
                    <h4 className="gba:font-semibold">Data Loading Error</h4>
                    <div
                      style={{ display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }}
                      className="gba:text-sm gba:mt-2"
                    >
                      {dataError}
                    </div>
                  </Alert>
                )}

                {/* Dynamic Form Generation from Flow Template */}
                {flowTemplate?.formSchema && (
                  <div className="gba:space-y-6">
                    <div className="gba:border-b gba:pb-4">
                      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">{flowTemplate.name} Details</h3>
                        {flowTemplate.version && (
                          <Badge variant="outline" className="gba:text-xs gba:font-normal">
                            v{flowTemplate.version}
                          </Badge>
                        )}
                      </div>
                      <p className="gba:text-sm gba:text-gray-600 gba:mt-1">{flowTemplate.description}</p>
                    </div>

                    {/* Step 0 Message - Instructions or information for the user */}
                    {flowTemplate.step0Message && (
                      <div className="gba:space-y-2">
                        <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:flex gba:items-center gba:gap-2">
                          <FileTextIcon className="gba:w-4 gba:h-4 gba:text-primary" />
                          Instructions
                        </h4>
                        <MessageRenderer
                          content={flowTemplate.step0Message}
                          format="auto"
                          variant="card"
                          data-testid="step0-message"
                        />
                      </div>
                    )}

                    {/* Render dynamic fields without form wrapper */}
                    <div className="gba:space-y-4">
                      {flowTemplate.formSchema.map(field => (
                        <div key={field.name} className="gba:space-y-2">
                          <label
                            htmlFor={field.name}
                            className="gba:block gba:text-sm gba:font-medium gba:text-gray-700"
                          >
                            {field.label}
                            {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
                          </label>
                          {field.description && <p className="gba:text-xs gba:text-gray-500">{field.description}</p>}

                          {/* Render field based on type */}
                          {field.type?.toUpperCase() === 'TEXT' && (
                            <Input
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={e => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}

                          {field.type?.toUpperCase() === 'TEXTAREA' && (
                            <Textarea
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={e => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                              rows={4}
                            />
                          )}

                          {field.type?.toUpperCase() === 'SELECT' && (
                            <DataSourceSelect
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={value => handleFieldChange(field.name, value)}
                              dataSource={field.dataSource?.type === 'ENTITY' ? field.dataSource : undefined}
                              accessToken={contextProps.accessToken}
                              placeholder={field.placeholder || `Search ${field.label}...`}
                              required={field.required}
                              data-testid={`select-${field.name}`}
                              initialOptions={field.options}
                            />
                          )}

                          {field.type?.toUpperCase() === 'DATE' && (
                            <DateTimeField
                              name={field.name}
                              label={field.label}
                              showLabel={false}
                              type="date"
                              value={formData[field.name] || null}
                              onChange={date =>
                                handleFieldChange(field.name, date ? date.toISOString().split('T')[0] : '')
                              }
                              required={field.required}
                              placeholder={field.placeholder}
                              description={field.description}
                            />
                          )}

                          {field.type?.toUpperCase() === 'DATETIME' && (
                            <DateTimeField
                              name={field.name}
                              label={field.label}
                              showLabel={false}
                              type="datetime"
                              value={formData[field.name] || null}
                              onChange={date => handleFieldChange(field.name, date ? date.toISOString() : '')}
                              required={field.required}
                              placeholder={field.placeholder}
                              description={field.description}
                            />
                          )}

                          {field.type?.toUpperCase() === 'NUMBER' && (
                            <NumberField
                              name={field.name}
                              label={field.label}
                              showLabel={false}
                              value={formData[field.name] ?? ''}
                              onChange={parsedValue => handleFieldChange(field.name, parsedValue)}
                              required={field.required}
                              placeholder={field.placeholder}
                              description={field.description}
                              id={field.name}
                            />
                          )}

                          {field.type?.toUpperCase() === 'EMAIL' && (
                            <Input
                              id={field.name}
                              type="email"
                              value={formData[field.name] || ''}
                              onChange={e => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}

                          {field.type?.toUpperCase() === 'CHECKBOX' && (
                            <div className="gba:space-y-3">
                              {field.options?.map(option => (
                                <label
                                  key={option.value}
                                  className="gba:flex gba:items-center gba:space-x-3 gba:cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    value={option.value}
                                    checked={
                                      Array.isArray(formData[field.name])
                                        ? formData[field.name].includes(option.value)
                                        : false
                                    }
                                    onChange={e => {
                                      const currentValue = Array.isArray(formData[field.name])
                                        ? formData[field.name]
                                        : []
                                      let newValue
                                      if (e.target.checked) {
                                        newValue = [...currentValue, option.value]
                                      } else {
                                        newValue = currentValue.filter((v: any) => v !== option.value)
                                      }
                                      handleFieldChange(field.name, newValue)
                                    }}
                                    className="gba:h-4 gba:w-4 gba:text-primary gba:border-input gba:rounded gba:focus:ring-2 gba:focus:ring-primary/20"
                                    data-testid={`checkbox-${field.name}-${option.value}`}
                                  />
                                  <span className="gba:text-sm gba:text-foreground gba:select-none">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                              {field.description && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{field.description}</p>
                              )}
                            </div>
                          )}

                          {field.type?.toUpperCase() === 'MULTISELECT' && (
                            <DataSourceMultiSelect
                              id={field.name}
                              value={Array.isArray(formData[field.name]) ? formData[field.name] : []}
                              onChange={values => handleFieldChange(field.name, values)}
                              dataSource={field.dataSource?.type === 'ENTITY' ? field.dataSource : undefined}
                              accessToken={contextProps.accessToken}
                              placeholder={field.placeholder || `Search ${field.label}...`}
                              required={field.required}
                              data-testid={`multiselect-${field.name}`}
                              initialOptions={field.options}
                            />
                          )}

                          {field.type?.toUpperCase() === 'RADIO' && (
                            <div className="gba:space-y-3">
                              {field.options?.map(option => (
                                <label
                                  key={option.value}
                                  className="gba:flex gba:items-center gba:space-x-3 gba:cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={field.name}
                                    value={option.value}
                                    checked={formData[field.name] === option.value}
                                    onChange={e => handleFieldChange(field.name, e.target.value)}
                                    className="gba:h-4 gba:w-4 gba:text-primary gba:border-input gba:focus:ring-2 gba:focus:ring-primary/20"
                                    required={field.required}
                                    data-testid={`radio-${field.name}-${option.value}`}
                                  />
                                  <span className="gba:text-sm gba:text-foreground gba:select-none">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                              {field.description && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{field.description}</p>
                              )}
                            </div>
                          )}

                          {field.type?.toUpperCase() === 'FILE' && (
                            <FileUploadField
                              name={field.name}
                              showLabel={false}
                              value={Array.isArray(formData[field.name]) ? formData[field.name] : []}
                              onChange={(files: UploadFile[]) => handleFieldChange(field.name, files)}
                              required={field.required}
                              description={field.description}
                              maxFiles={field.fileUpload?.maxFiles || 5}
                              allowedFileTypes={field.fileUpload?.allowedFileTypes}
                              maxFileSize={field.fileUpload?.maxFileSize || 10}
                              accessToken={contextProps.accessToken}
                              disabled={isLoading || isUploadingFiles}
                              hideUploadButton={true}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* 🌐 UNIVERSAL: Step Assignment Section */}
                {stepsRequiringAssignment.filter(step => showFirstStepAssignment || step.stepIndex !== 0).length >
                  0 && (
                  <div className="gba:space-y-6">
                    <div className="gba:border-l-4 gba:border-blue-500 gba:pl-4 gba:py-2 gba:bg-blue-50">
                      <h4 className="gba:text-base gba:font-semibold gba:flex gba:items-center gba:text-blue-900">
                        <UsersIcon className="gba:mr-2" size={16} />
                        Step Assignments
                      </h4>
                      <p className="gba:text-sm gba:text-blue-700 gba:mt-1">
                        This template requires specific step assignments. Steps marked as "ASSIGN" are automatically
                        assigned to you. You can assign "CLAIM" steps to others if needed.
                        {!showFirstStepAssignment && (
                          <span className="gba:block gba:text-xs gba:text-blue-600 gba:mt-1">
                            Note: First step assignment is hidden (always assigned to you). Add
                            ?showFirstStepAssignment=true to URL to see it.
                          </span>
                        )}
                      </p>
                    </div>

                    {loadingAssignments ? (
                      <div className="gba:flex gba:items-center gba:justify-center gba:p-4">
                        <Spinner size="sm" className="gba:mr-3" />
                        <span className="gba:text-sm gba:text-muted-foreground">Loading required assignments...</span>
                      </div>
                    ) : (
                      <div className="gba:space-y-4">
                        {stepsRequiringAssignment
                          .filter(step => showFirstStepAssignment || step.stepIndex !== 0)
                          .map(step => (
                            <div key={step.stepId} className="gba:p-4 gba:border gba:rounded-lg gba:bg-gray-50">
                              <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                                <div>
                                  <h5 className="gba:font-semibold gba:text-gray-900">{step.title}</h5>
                                  <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                                    <Badge
                                      variant="outline"
                                      className={`gba:text-xs ${
                                        step.assignmentMode === 'ASSIGN'
                                          ? 'gba:bg-green-50 gba:text-green-700 gba:border-green-200'
                                          : 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200'
                                      }`}
                                    >
                                      {step.assignmentMode} Mode
                                    </Badge>
                                    <span className="gba:text-xs gba:text-gray-500">Step {step.stepIndex + 1}</span>
                                  </div>
                                </div>
                              </div>

                              {/* ASSIGN Mode - Auto-assigned to current user */}
                              {step.assignmentMode === 'ASSIGN' ? (
                                <div className="gba:space-y-3">
                                  <label className="gba:flex gba:items-center gba:text-sm gba:font-semibold gba:text-foreground">
                                    <UserIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:text-green-600" />
                                    Assigned to
                                  </label>

                                  <div className="gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded">
                                    <div className="gba:flex gba:items-center">
                                      <UserIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:text-green-600" />
                                      <div>
                                        <span className="gba:font-medium gba:text-green-900">You (Current User)</span>
                                        <p className="gba:text-xs gba:text-green-700">
                                          This step is automatically assigned to you as the requester.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* CLAIM Mode - Allow assignment selection */
                                <div className="gba:space-y-3">
                                  <label className="gba:flex gba:items-center gba:text-sm gba:font-semibold gba:text-foreground">
                                    <UserIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:text-primary" />
                                    Assign to User
                                    <span className="gba:text-destructive gba:ml-1">*</span>
                                  </label>

                                  <Select
                                    value={formData.stepAssignments?.[step.stepId] || ''}
                                    onValueChange={val => handleFieldChange(`stepAssignment_${step.stepId}`, val)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select user to assign this step to..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* Current user option */}
                                      <SelectItem value={contextProps.userInfo?.id || 'current-user'}>
                                        <div className="gba:flex gba:flex-col">
                                          <span className="gba:font-medium">You (Current User)</span>
                                          <span className="gba:text-xs gba:text-muted-foreground">
                                            Handle this step yourself
                                          </span>
                                        </div>
                                      </SelectItem>

                                      <Separator className="gba:my-1" />

                                      {/* Employee options */}
                                      {getEmployeeOptions(employees).map(emp => (
                                        <SelectItem key={emp.value} value={emp.value}>
                                          <div className="gba:flex gba:flex-col">
                                            <span className="gba:font-medium">{emp.label}</span>
                                            {emp.jobTitle && (
                                              <span className="gba:text-xs gba:text-muted-foreground">
                                                {emp.jobTitle} • {emp.department}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="gba:text-xs gba:text-blue-600 gba:bg-blue-50 gba:p-2 gba:rounded">
                                    ℹ️ This step uses CLAIM mode - you can assign it to yourself or someone else who can
                                    claim the task.
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {stepsRequiringAssignment.filter(step => showFirstStepAssignment || step.stepIndex !== 0).length >
                  0 && <Separator />}

                {/* Additional Information Section */}
                <div className="gba:space-y-4">
                  <h4 className="gba:text-base gba:font-semibold gba:flex gba:items-center">
                    <FileTextIcon className="gba:mr-2" size={16} />
                    Additional Information
                  </h4>
                  <Textarea
                    placeholder="Enter any additional comments or information..."
                    value={formData.additionalComments || ''}
                    onChange={e => handleFieldChange('additionalComments', e.target.value)}
                    className="gba:min-h-[100px] gba:resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="gba:flex gba:flex-col gba:gap-4 gba:pt-6">
                  {/* AI Quick Solution Button */}
                  <button
                    type="button"
                    onClick={handleAskAI}
                    disabled={isLoading || aiLoading}
                    className="gba:w-full gba:py-4 gba:px-6 gba:bg-gradient-to-br gba:from-ai-from gba:to-ai-to gba:text-ai-foreground gba:font-semibold gba:rounded-lg gba:border-0 gba:shadow-xl hover:gba:shadow-2xl gba:transition-all gba:duration-300 gba:ease-in-out hover:gba:scale-105 active:gba:scale-95 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed disabled:hover:gba:scale-100 gba:relative gba:overflow-hidden gba:group"
                    data-testid="ask-ai-button"
                  >
                    {/* Content */}
                    <div className="gba:relative gba:flex gba:items-center gba:justify-center gba:gap-3 gba:z-10">
                      {aiLoading ? (
                        <>
                          <Spinner size="sm" className="gba:w-6 gba:h-6" />
                          <span className="gba:text-lg gba:font-bold gba:tracking-wide">AI is thinking...</span>
                          <BrainIcon className="gba:w-5 gba:h-5 gba:animate-pulse" />
                        </>
                      ) : (
                        <>
                          <RobotIcon className="gba:w-6 gba:h-6 group-hover:gba:animate-bounce" />
                          <span className="gba:text-lg gba:font-bold gba:tracking-wide">Ask AI for quick solution</span>
                          <SparkleIcon className="gba:w-5 gba:h-5 gba:animate-pulse" />
                        </>
                      )}
                    </div>
                  </button>

                  {/* Primary Actions */}
                  <div className="gba:flex gba:gap-4">
                    <Button
                      type="submit"
                      disabled={isLoading || isUploadingFiles || completionPercentage < 100}
                      className="gba:flex-1 gba:py-3"
                      size="lg"
                    >
                      {isUploadingFiles ? (
                        <>
                          <Spinner size="sm" className="gba:mr-2" />
                          {uploadProgress || 'Uploading files...'}
                        </>
                      ) : isLoading ? (
                        <>
                          <Spinner size="sm" className="gba:mr-2" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="gba:mr-2" size={16} />
                          Submit Request
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isLoading}
                      className="gba:px-8"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Help Text */}
                <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:border gba:border-border">
                  <div className="gba:flex gba:items-start gba:space-x-3">
                    <WarningIcon className="gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" size={16} />
                    <div className="gba:text-sm gba:text-muted-foreground gba:space-y-1">
                      <p className="gba:font-medium gba:text-foreground">Important Information:</p>
                      <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                        <li>All required fields must be completed before submission</li>
                        <li>Your request will be automatically routed to the appropriate teams</li>
                        <li>You'll receive email notifications at each step of the process</li>
                        <li>Track progress anytime in the "My Requests" section</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="gba:space-y-6">
            {/* Flow Steps Preview - Show for flow templates */}
            {flowTemplate && flowTemplate.steps && (
              <Card className="gba:p-6 gba:bg-gradient-to-r gba:from-indigo-50 gba:to-blue-50 gba:border-indigo-200">
                <h3 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-4 gba:flex gba:items-center">
                  <SparkleIcon className="gba:mr-2 gba:text-indigo-600" size={20} />
                  Workflow Steps
                </h3>

                <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
                  This request will follow {flowTemplate.steps.length} workflow step
                  {flowTemplate.steps.length !== 1 ? 's' : ''}:
                </p>

                <div className="gba:space-y-4">
                  {flowTemplate.steps.slice(0, 5).map((step: any, index: number) => {
                    // Helper function to get step type icon and color
                    const getStepTypeInfo = (type: string) => {
                      switch (type) {
                        case 'TASK':
                          return { icon: '📋', color: 'gba:bg-blue-600', bgColor: 'gba:bg-blue-50' }
                        case 'GATEWAY':
                          return { icon: '🔀', color: 'gba:bg-yellow-600', bgColor: 'gba:bg-yellow-50' }
                        case 'SUBPROCESS':
                          return { icon: '⚙️', color: 'gba:bg-purple-600', bgColor: 'gba:bg-purple-50' }
                        default:
                          return { icon: '📝', color: 'gba:bg-gray-600', bgColor: 'gba:bg-gray-50' }
                      }
                    }

                    // Helper function to format assignment info
                    const getAssignmentInfo = (assignment: any) => {
                      if (!assignment) return 'System'

                      const { targets, assignmentMode } = assignment

                      if (index === 0) return 'You (Requester)'

                      if (targets?.organizationalUnits?.length > 0) {
                        const mode = assignmentMode === 'CLAIM' ? 'Team (any member)' : 'Team (assigned)'
                        return mode
                      }

                      if (targets?.users?.length > 0) {
                        return assignmentMode === 'CLAIM' ? 'Specific Users' : 'Assigned User'
                      }

                      return assignmentMode === 'CLAIM' ? 'Available Team Member' : 'System Assigned'
                    }

                    // Helper function to format duration
                    const formatDuration = (minutes: number) => {
                      if (!minutes) return 'Variable'

                      if (minutes < 60) return `${minutes} min`

                      const hours = Math.floor(minutes / 60)
                      const remainingMinutes = minutes % 60

                      if (hours < 24) {
                        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
                      }

                      const days = Math.floor(hours / 24)
                      const remainingHours = hours % 24

                      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
                    }

                    const typeInfo = getStepTypeInfo(step.type)
                    const assignmentInfo = getAssignmentInfo(step.assignment)
                    const duration = formatDuration(step.dueInMinutes)

                    return (
                      <div
                        key={step.id || index}
                        className={`gba:p-3 gba:rounded-lg gba:border ${typeInfo.bgColor} gba:border-opacity-30`}
                      >
                        <div className="gba:flex gba:items-start gba:space-x-3">
                          <div
                            className={`gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full ${typeInfo.color} gba:text-white gba:text-xs gba:font-bold gba:flex-shrink-0`}
                          >
                            {index + 1}
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-start gba:justify-between gba:mb-1">
                              <h4 className="gba:font-semibold gba:text-sm gba:text-foreground gba:leading-tight">
                                {step.title || `Step ${index + 1}`}
                              </h4>
                              <span className="gba:text-xs gba:text-gray-500 gba:ml-2 gba:flex-shrink-0">
                                {typeInfo.icon}
                              </span>
                            </div>

                            {step.message && (
                              <MessageRenderer
                                content={step.message}
                                format="auto"
                                variant="compact"
                                className="gba:mb-2"
                              />
                            )}

                            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs">
                              <span className="gba:text-muted-foreground">👤 {assignmentInfo}</span>
                              <span className="gba:text-muted-foreground">⏱️ {duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {flowTemplate.steps.length > 5 && (
                    <div className="gba:text-center gba:text-xs gba:text-muted-foreground gba:pt-2 gba:border-t gba:border-gray-200">
                      ... and {flowTemplate.steps.length - 5} more step{flowTemplate.steps.length - 5 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageLayout>

      {/* AI Response Modal */}
      <Dialog open={showAIResponse} onOpenChange={setShowAIResponse}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[80vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-3 gba:text-2xl">
              <div className="gba:p-2 gba:rounded-full gba:bg-gradient-to-r gba:from-purple-500 gba:to-blue-500">
                <BrainIcon className="gba:w-6 gba:h-6 gba:text-white" />
              </div>
              AI Assistant Response
              {aiResponseType === 'validation' && <ShieldCheckIcon className="gba:w-5 gba:h-5 gba:text-orange-500" />}
              {aiResponseType === 'optimization' && <TargetIcon className="gba:w-5 gba:h-5 gba:text-green-500" />}
              {aiResponseType === 'suggestion' && <LightbulbIcon className="gba:w-5 gba:h-5 gba:text-blue-500" />}
            </DialogTitle>
            <DialogDescription className="gba:text-gray-600">
              AI-powered analysis of your service request form
            </DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-6 gba:py-4">
            {/* Loading State */}
            {aiLoading ? (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-4">
                <div className="gba:relative">
                  <div className="gba:w-16 gba:h-16 gba:border-4 gba:border-purple-200 gba:border-t-purple-500 gba:rounded-full gba:animate-spin"></div>
                  <BrainIcon className="gba:absolute gba:top-1/2 gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:-translate-y-1/2 gba:w-6 gba:h-6 gba:text-purple-500" />
                </div>
                <div className="gba:text-center">
                  <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">AI is analyzing your form...</h3>
                  <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
                    Reviewing {Object.keys(formData).length} form fields and generating personalized suggestions
                  </p>
                </div>
              </div>
            ) : (
              /* AI Response Content */
              <div className="gba:space-y-6">
                {/* Response Type Badge */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Badge
                    variant="outline"
                    className={`gba:px-3 gba:py-1 gba:text-sm gba:font-medium ${
                      aiResponseType === 'validation'
                        ? 'gba:bg-orange-50 gba:text-orange-700 gba:border-orange-200'
                        : aiResponseType === 'optimization'
                          ? 'gba:bg-green-50 gba:text-green-700 gba:border-green-200'
                          : 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200'
                    }`}
                  >
                    {aiResponseType === 'validation' && '🔍 Form Validation'}
                    {aiResponseType === 'optimization' && '✨ Optimization'}
                    {aiResponseType === 'suggestion' && '💡 Smart Suggestions'}
                  </Badge>
                  <Badge variant="outline" className="gba:text-xs gba:bg-gray-50">
                    Form Completion: {completionPercentage}%
                  </Badge>
                </div>

                {/* AI Response Text */}
                <Card className="gba:p-6 gba:bg-gradient-to-br gba:from-gray-50 gba:to-white gba:border-l-4 gba:border-l-purple-500">
                  <div className="gba:prose gba:prose-sm gba:max-w-none">
                    <div
                      className="gba:whitespace-pre-line gba:text-gray-800 gba:leading-relaxed"
                      dangerouslySetInnerHTML={parseMarkdownForReact(aiResponse)}
                    />
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="gba:flex gba:gap-3 gba:pt-4 gba:border-t gba:border-gray-200">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResponse)
                      // Could add a toast notification here
                    }}
                    variant="outline"
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <CopyIcon className="gba:w-4 gba:h-4" />
                    Copy Response
                  </Button>

                  <Button
                    onClick={() => {
                      // Could implement feedback functionality
                      console.log('👍 AI Response feedback: Helpful')
                    }}
                    variant="outline"
                    className="gba:flex gba:items-center gba:gap-2 gba:text-green-600 hover:gba:bg-green-50"
                  >
                    <ThumbsUpIcon className="gba:w-4 gba:h-4" />
                    Helpful
                  </Button>

                  <Button
                    onClick={() => setShowAIResponse(false)}
                    className="gba:ml-auto gba:bg-purple-500 hover:gba:bg-purple-600"
                  >
                    Got it, thanks!
                  </Button>
                </div>

                {/* Pro Tip */}
                <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-4">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <LightbulbIcon className="gba:w-5 gba:h-5 gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" />
                    <div>
                      <h4 className="gba:font-semibold gba:text-blue-800 gba:text-sm">Pro Tip</h4>
                      <p className="gba:text-blue-700 gba:text-sm gba:mt-1">
                        You can ask the AI for help again after making changes to your form. The suggestions will be
                        updated based on your progress!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
