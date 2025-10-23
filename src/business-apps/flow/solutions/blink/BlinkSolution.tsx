import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Card, CardContent } from '@newwork/nw-design-system'
import { Zap } from 'lucide-react'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { useForm } from 'react-hook-form'
import { BlinkFlowService } from './services/BlinkFlowService'
import { env } from '@/common/env/EnvUtils'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { useAllEmployees } from './hooks/useAllEmployees'
import { useBlinkFileUpload, BlinkUploadFile } from './hooks/useBlinkFileUpload'
import { BlinkTaskForm, BlinkTaskFormData } from './components/BlinkTaskForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type BlinkSolutionProps = BusinessAppContextProps

export const BlinkSolution: React.FC<BlinkSolutionProps> = context => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')

  // Fetch ALL employees for the dropdown
  const { employees, loading: employeesLoading } = useAllEmployees(context.accessToken)

  // Initialize file upload hook
  const { uploadFiles } = useBlinkFileUpload({
    accessToken: context.accessToken,
    onSuccess: (results: any[]) => {
      console.log('[Blink] File upload completed:', results)
    },
    onError: (error: string) => {
      console.error('[Blink] File upload error:', error)
    }
  })

  // Convert employees to combobox options
  // Note: For proper search filtering, we use the searchable text as 'value'
  // and store the actual userId in a map
  const employeeOptions = useMemo(() => {
    return employees.map(employee => ({
      value: employee.fullName,
      label: employee.fullName
    }))
  }, [employees])

  // Create a map to convert display value back to userId
  const employeeValueToIdMap = useMemo(() => {
    const map = new Map<string, string>()

    employees.forEach(employee => {
      map.set(employee.fullName, employee.userId)
    })

    return map
  }, [employees])

  const form = useForm<BlinkTaskFormData>({
    defaultValues: {
      title: '',
      message: '',
      documents: [],
      assignedUserId: '',
      dueDate: ''
    }
  })

  const onSubmit = useCallback(
    async (data: BlinkTaskFormData) => {
      setIsSubmitting(true)
      try {
        console.log('Creating Blink task with data:', data)

        // Convert display value to actual userId
        const actualUserId = employeeValueToIdMap.get(data.assignedUserId)
        if (!actualUserId) {
          throw new Error('Invalid employee selection')
        }

        // Step 1: Upload files if any exist
        let uploadResults: any[] = []
        if (data.documents && data.documents.length > 0) {
          setIsUploadingFiles(true)
          setUploadProgress('Uploading files...')

          try {
            // Extract actual File objects from BlinkUploadFile array
            const filesToUpload = data.documents
              .filter((uploadFile: BlinkUploadFile) => uploadFile.originFileObj instanceof File)
              .map((uploadFile: BlinkUploadFile) => uploadFile.originFileObj!)

            if (filesToUpload.length > 0) {
              // Generate a temporary request ID for file organization
              const tempRequestId = `blink-temp-${Date.now()}`

              // Upload files
              uploadResults = await uploadFiles(filesToUpload, tempRequestId)
              console.log('Files uploaded successfully:', uploadResults)
            }
          } catch (uploadErr) {
            throw new Error(
              `Failed to upload files: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`
            )
          } finally {
            setIsUploadingFiles(false)
            setUploadProgress('')
          }
        }

        // Step 2: Generate dynamic workflow template with uploaded file info
        const flowTemplate = BlinkFlowService.generateFlowTemplate({
          ...data,
          uploadResults, // Pass upload results instead of raw files
          priority: 'medium', // Could be made configurable
          assignments: {
            assignmentMode: AssignmentMode.ASSIGN, // Use ASSIGN mode for runtime assignment
            targets: null, // null means runtime assignment via stepAssignments
            allowReassignment: false
          }
        })

        console.log('Generated flow template with tags:', flowTemplate)

        // Create execution payload
        const executionPayload = BlinkFlowService.createWorkflowExecutionPayload(
          flowTemplate,
          context.userInfo?.id || 'unknown'
        )

        console.log('Execution payload:', executionPayload)

        // Execute the workflow via template dynamic execution API
        const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'
        const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${context.accessToken}`
          },
          body: JSON.stringify({
            templateDefinition: flowTemplate,
            initiatorId: context.userInfo?.id || 'unknown',
            stepAssignments: {
              step_0: {
                assignment: {
                  assignmentMode: AssignmentMode.ASSIGN,
                  targets: {
                    users: [actualUserId], // Actual userId from map
                    capabilities: [],
                    organizationalUnits: [],
                    companies: [],
                    siteLocations: [],
                    costCenters: [],
                    matrixTeams: []
                  },
                  allowReassignment: false
                }
                // Let the backend generate resolvedConfig using existing workflow generation logic
              }
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to create Blink task')
        }

        const result = await response.json()
        console.log('Blink task created successfully:', result)

        // Reset form and show success
        form.reset()

        showToast(
          getTranslationFromI18nKeyAndLabel(
            'blink.success.message',
            `Blink task "${data.title}" created successfully! Workflow ID: ${result.data.workflowId}`,
            { title: data.title, workflowId: result.data.workflowId }
          ),
          'success',
          getTranslationFromI18nKeyAndLabel('blink.success.title', 'Task Created')
        )
      } catch (error) {
        console.error('Error creating Blink task:', error)
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'blink.error.message',
            `Error creating Blink task: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          ),
          'error',
          getTranslationFromI18nKeyAndLabel('blink.error.title', 'Task Creation Failed')
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [employeeValueToIdMap, uploadFiles, context.accessToken, context.userInfo?.id, form]
  )

  return (
    <div data-testid="blink-solution-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Zap,
          variant: 'default',
          size: 'lg',
          label: getTranslationFromI18nKeyAndLabel('blink.header.label', 'Blink')
        }}
        headerTitle={getTranslationFromI18nKeyAndLabel('blink.header.title', 'Blink')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'blink.header.description',
          'Create quick tasks and assign them instantly'
        )}
        className="gba:min-h-screen"
      >
        <div className="gba:max-w-4xl gba:mx-auto gba:py-8">
          <Card>
            <CardContent className="gba:p-8">
              <div className="gba:mb-6">
                <h2 className="gba:text-2xl gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('blink.form.title', 'Create New Blink')}
                </h2>
                <p className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'blink.form.description',
                    'Fill out the form below to create and assign a task. The assignee will see it in their inbox immediately.'
                  )}
                </p>
              </div>

              <BlinkTaskForm
                form={form}
                onSubmit={onSubmit}
                employeeOptions={employeeOptions}
                employeesLoading={employeesLoading}
                isSubmitting={isSubmitting}
                isUploadingFiles={isUploadingFiles}
                uploadProgress={uploadProgress}
              />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
  )
}

export default BlinkSolution
