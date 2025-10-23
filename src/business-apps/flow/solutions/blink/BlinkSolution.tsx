import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  PageLayout,
  Card,
  CardContent,
  Combobox
} from '@newwork/nw-design-system'
import { Zap } from 'lucide-react'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { useForm } from 'react-hook-form'
import { BlinkFlowService } from './services/BlinkFlowService'
import { env } from '@/common/env/EnvUtils'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { useAllEmployees } from './hooks/useAllEmployees'
import { BlinkFileUpload } from './components/BlinkFileUpload'
import { useBlinkFileUpload, BlinkUploadFile } from './hooks/useBlinkFileUpload'

export type BlinkSolutionProps = BusinessAppContextProps

interface BlinkFlowFormData {
  title: string
  message: string
  documents: BlinkUploadFile[]
  assignedUserId: string
  dueDate: string
}

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

  const form = useForm<BlinkFlowFormData>({
    defaultValues: {
      title: '',
      message: '',
      documents: [],
      assignedUserId: '',
      dueDate: ''
    }
  })

  const onSubmit = async (data: BlinkFlowFormData) => {
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
          throw new Error(`Failed to upload files: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`)
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
        `Blink task "${data.title}" created successfully! Workflow ID: ${result.data.workflowId}`,
        'success',
        'Task Created'
      )
    } catch (error) {
      console.error('Error creating Blink task:', error)
      showToast(
        `Error creating Blink task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
        'Task Creation Failed'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div data-testid="blink-solution-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Zap,
          variant: 'default',
          size: 'lg',
          label: 'Blink'
        }}
        headerTitle="Blink"
        headerDescription="Create quick tasks and assign them instantly"
        className="gba:min-h-screen"
      >
        <div className="gba:max-w-4xl gba:mx-auto gba:py-8">
          <Card>
            <CardContent className="gba:p-8">
              <div className="gba:mb-6">
                <h2 className="gba:text-2xl gba:font-semibold gba:mb-2">Create New Blink</h2>
                <p className="gba:text-gray-600">
                  Fill out the form below to create and assign a task. The assignee will see it in their inbox
                  immediately.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-6">
                  {/* Title Field */}
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title..." {...field} data-testid="blink-task-title-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Message Field */}
                  <FormField
                    control={form.control}
                    name="message"
                    rules={{ required: 'Message is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter detailed description or instructions..."
                            rows={4}
                            {...field}
                            data-testid="blink-task-message-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Documents Field */}
                  <FormField
                    control={form.control}
                    name="documents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachments (Optional)</FormLabel>
                        <FormControl>
                          <BlinkFileUpload
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting || isUploadingFiles}
                            maxFiles={5}
                            maxFileSize={10}
                            allowedFileTypes={[
                              '.pdf',
                              '.doc',
                              '.docx',
                              '.txt',
                              '.xls',
                              '.xlsx',
                              '.jpg',
                              '.jpeg',
                              '.png',
                              '.zip'
                            ]}
                          />
                        </FormControl>
                        <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                          Upload supporting documents for this task
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Employee Selector */}
                  <FormField
                    control={form.control}
                    name="assignedUserId"
                    rules={{ required: 'Please select an employee to assign' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <FormControl>
                          <Combobox
                            options={employeeOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select employee..."
                            searchPlaceholder="Search employees..."
                            emptyText="No employees found"
                            loading={employeesLoading}
                            loadingText="Loading employees..."
                            disabled={employeesLoading}
                            data-testid="blink-task-assignee"
                          />
                        </FormControl>
                        <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                          Shows all employees in the organization. You can assign tasks to anyone.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Due Date Field */}
                  <FormField
                    control={form.control}
                    name="dueDate"
                    rules={{ required: 'Due date is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="Select due date..."
                            {...field}
                            data-testid="blink-task-due-date-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset()
                      }}
                    >
                      Clear Form
                    </Button>
                    <Button type="submit" variant="default" disabled={isSubmitting || isUploadingFiles}>
                      {isUploadingFiles
                        ? uploadProgress || 'Uploading files...'
                        : isSubmitting
                          ? 'Creating Task...'
                          : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
  )
}

export default BlinkSolution
