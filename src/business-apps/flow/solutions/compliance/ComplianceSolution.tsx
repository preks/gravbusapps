import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  PageLayout
} from '@newwork/nw-design-system'
import { Shield, BarChart3, FileSearch, Plus, Upload, FileText } from 'lucide-react'
import { AssignmentSelector } from '@/components/assignment-selector'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { useForm } from 'react-hook-form'
import { DashboardTab } from './components/DashboardTab'
import { AnalyticsTab } from './components/AnalyticsTab'
import { AuditTab } from './components/AuditTab'
import { ComplianceFlowService } from './services/ComplianceFlowService'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

export interface ComplianceSolutionProps extends BusinessAppContextProps {}

interface ComplianceFlowFormData {
  title: string
  message: string
  documents: File[]
  assignments: any
  dueDate: string
}

export const ComplianceSolution: React.FC<ComplianceSolutionProps> = context => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <Shield className="gba:w-4 gba:h-4" />,
      label: 'Dashboard'
    },
    {
      key: 'analytics',
      icon: <BarChart3 className="gba:w-4 gba:h-4" />,
      label: 'Analytics'
    },
    {
      key: 'audit',
      icon: <FileSearch className="gba:w-4 gba:h-4" />,
      label: 'Audit'
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    return viewOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const form = useForm<ComplianceFlowFormData>({
    defaultValues: {
      title: '',
      message: '',
      documents: [],
      assignments: null,
      dueDate: ''
    }
  })

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', view)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (key: string) => {
    if (!key) return
    setActiveTab(key)
    updateUrl(key)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
    form.setValue('documents', [...form.getValues('documents'), ...files])
  }

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(updatedFiles)
    form.setValue('documents', updatedFiles)
  }

  const onSubmit = async (data: ComplianceFlowFormData) => {
    try {
      console.log('Creating compliance flow with data:', data)
      console.log('Assignment data structure:', JSON.stringify(data.assignments, null, 2))

      // Generate dynamic workflow template with tags
      const flowTemplate = ComplianceFlowService.generateFlowTemplate({
        ...data,
        documents: uploadedFiles,
        complianceType: 'general', // Could be made configurable
        priority: 'medium', // Could be made configurable
        department: 'general', // TODO: Get from user context when available
        assignments: {
          assignmentMode: AssignmentMode.ASSIGN, // Use ASSIGN mode for runtime assignment
          targets: null, // null means runtime assignment via stepAssignments
          allowReassignment: false
        }
      })

      console.log('Generated flow template with tags:', flowTemplate)

      // Create execution payload
      const executionPayload = ComplianceFlowService.createWorkflowExecutionPayload(
        flowTemplate,
        context.userInfo?.id || 'unknown'
      )

      console.log('Execution payload:', executionPayload)

      // Execute the workflow via template dynamic execution API
      const baseUrl = getFlowEngineBaseUrl()
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
                assignmentMode: data.assignments?.assignmentMode || AssignmentMode.ASSIGN,
                targets: data.assignments?.targets || {
                  users: [context.userInfo?.id || 'unknown'],
                  capabilities: [],
                  organizationalUnits: [],
                  companies: [],
                  siteLocations: [],
                  costCenters: [],
                  matrixTeams: []
                },
                allowReassignment: data.assignments?.allowReassignment ?? false
              }
              // Let the backend generate resolvedConfig using existing workflow generation logic
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create compliance flow')
      }

      const result = await response.json()
      console.log('Compliance flow created successfully:', result)

      // Close modal and show success
      setIsFlowModalOpen(false)
      form.reset()
      setUploadedFiles([])

      // Notify dashboard to refresh and show success
      try {
        window.dispatchEvent(new CustomEvent('compliance-flow-created'))
      } catch {}
      showToast(
        `Compliance flow "${data.title}" created successfully! Workflow ID: ${result.data.workflowId}`,
        'success',
        'Flow Created'
      )
    } catch (error) {
      console.error('Error creating compliance flow:', error)
      showToast(
        `Error creating compliance flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
        'Flow Creation Failed'
      )
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...context} />
      case 'analytics':
        return <AnalyticsTab {...context} />
      case 'audit':
        return <AuditTab {...context} />
      default:
        return null
    }
  }

  return (
    <div data-testid="compliance-solution-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Shield,
          variant: 'default',
          size: 'lg',
          label: 'Compliance'
        }}
        headerTitle="Compliance"
        headerDescription="Manage regulatory obligations, policies, and compliance workflows"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        headerContent={
          <Dialog open={isFlowModalOpen} onOpenChange={setIsFlowModalOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Start Compliance Flow
              </Button>
            </DialogTrigger>
            <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Start New Compliance Flow</DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-6">
                  {/* Title Field */}
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter compliance flow title..."
                            {...field}
                            data-testid="compliance-flow-title-input"
                          />
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
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter detailed message or instructions..."
                            rows={4}
                            {...field}
                            data-testid="compliance-flow-message-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Documents Field */}
                  <FormItem>
                    <FormLabel>Documents</FormLabel>
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                          className="gba:hidden"
                          id="document-upload"
                          data-testid="compliance-flow-documents-input"
                        />
                        <label
                          htmlFor="document-upload"
                          className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border gba:border-dashed gba:border-gray-300 gba:rounded-md gba:cursor-pointer hover:gba:border-gray-400"
                        >
                          <Upload className="gba:w-4 gba:h-4" />
                          Upload Documents
                        </label>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="gba:space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-gray-50 gba:rounded-md"
                            >
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <FileText className="gba:w-4 gba:h-4 gba:text-blue-500" />
                                <span className="gba:text-sm">{file.name}</span>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormItem>

                  {/* Assignment Selector */}
                  <FormField
                    control={form.control}
                    name="assignments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignees</FormLabel>
                        <FormControl>
                          <AssignmentSelector
                            value={field.value}
                            onChange={field.onChange}
                            assignmentMode={AssignmentMode.ASSIGN}
                            accessToken={context.accessToken}
                            userInfo={context.userInfo}
                            data-testid="compliance-flow-assignments"
                          />
                        </FormControl>
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
                            data-testid="compliance-flow-due-date-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t">
                    <Button type="button" variant="outline" onClick={() => setIsFlowModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="default">
                      Create & Start Flow
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default ComplianceSolution
