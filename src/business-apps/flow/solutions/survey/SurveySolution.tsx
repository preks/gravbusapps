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
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { ClipboardList, BarChart3, FileSearch, Plus, Upload, FileText } from 'lucide-react'
import { AssignmentSelector } from '@/components/assignment-selector'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { useForm } from 'react-hook-form'
import { DashboardTab } from './components/DashboardTab'
import { SurveyTemplatesTab } from './components/SurveyTemplatesTab'
import { SurveyDataTab } from './components/SurveyDataTab'
import { AnalyticsTab } from './components/AnalyticsTab'
import { AuditTab } from './components/AuditTab'
import { SurveyFlowService } from './services/SurveyFlowService'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

export interface SurveySolutionProps extends BusinessAppContextProps {}

interface SurveyFlowFormData {
  title: string
  message: string
  surveyType: 'feedback' | 'research' | 'assessment' | 'poll' | 'custom'
  questions: Array<{
    question: string
    type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'number'
    required: boolean
    options?: string[]
    minRating?: number
    maxRating?: number
    placeholder?: string
  }>
  documents: File[]
  assignments: any
  dueDate: string
  anonymous?: boolean
}

export const SurveySolution: React.FC<SurveySolutionProps> = context => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <ClipboardList className="gba:w-4 gba:h-4" />,
      label: 'Dashboard'
    },
    {
      key: 'data',
      icon: <FileSearch className="gba:w-4 gba:h-4" />,
      label: 'Survey Data'
    },
    {
      key: 'templates',
      icon: <FileText className="gba:w-4 gba:h-4" />,
      label: 'Survey Templates'
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
  const [questions, setQuestions] = useState<
    Array<{
      question: string
      type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'number'
      required: boolean
      options?: string[]
      minRating?: number
      maxRating?: number
      placeholder?: string
    }>
  >([
    {
      question: '',
      type: 'text',
      required: true,
      options: [],
      placeholder: ''
    }
  ])

  const form = useForm<SurveyFlowFormData>({
    defaultValues: {
      title: '',
      message: '',
      surveyType: 'feedback',
      questions: [
        {
          question: '',
          type: 'text',
          required: true,
          options: [],
          placeholder: ''
        }
      ],
      documents: [],
      assignments: null,
      dueDate: '',
      anonymous: false
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

  const addQuestion = () => {
    const newQuestion = {
      question: '',
      type: 'text' as const,
      required: true,
      options: [],
      placeholder: ''
    }
    const newQuestions = [...questions, newQuestion]
    setQuestions(newQuestions)
    form.setValue('questions', newQuestions)
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index)
      setQuestions(updatedQuestions)
      form.setValue('questions', updatedQuestions)
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }

    // Clear options when changing away from multi-option types
    if (field === 'type' && !['select', 'radio', 'checkbox'].includes(value)) {
      updatedQuestions[index].options = []
    }
    // Initialize options for multi-choice types if they don't exist
    else if (field === 'type' && ['select', 'radio', 'checkbox'].includes(value) && !updatedQuestions[index].options) {
      updatedQuestions[index].options = ['']
    }

    setQuestions(updatedQuestions)
    form.setValue('questions', updatedQuestions)
  }

  const addQuestionOption = (questionIndex: number) => {
    const updatedQuestions = [...questions]
    const currentOptions = updatedQuestions[questionIndex].options || []
    updatedQuestions[questionIndex].options = [...currentOptions, '']
    setQuestions(updatedQuestions)
    form.setValue('questions', updatedQuestions)
  }

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions]
    const currentOptions = [...(updatedQuestions[questionIndex].options || [])]
    currentOptions[optionIndex] = value
    updatedQuestions[questionIndex].options = currentOptions
    setQuestions(updatedQuestions)
    form.setValue('questions', updatedQuestions)
  }

  const removeQuestionOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions]
    const currentOptions = updatedQuestions[questionIndex].options || []
    if (currentOptions.length > 1) {
      updatedQuestions[questionIndex].options = currentOptions.filter((_, i) => i !== optionIndex)
      setQuestions(updatedQuestions)
      form.setValue('questions', updatedQuestions)
    }
  }

  const onSubmit = async (data: SurveyFlowFormData) => {
    try {
      // Generate dynamic workflow template with tags
      const flowTemplate = SurveyFlowService.generateFlowTemplate({
        ...data,
        questions: questions.filter(q => q.question.trim() !== ''),
        documents: uploadedFiles,
        priority: 'medium', // Could be made configurable
        department: 'general', // TODO: Get from user context when available
        assignments: {
          assignmentMode: AssignmentMode.ASSIGN, // Use ASSIGN mode for runtime assignment
          targets: null, // null means runtime assignment via stepAssignments
          allowReassignment: false
        }
      })

      // Create execution payload
      const executionPayload = SurveyFlowService.createWorkflowExecutionPayload(
        flowTemplate,
        context.userInfo?.id || 'unknown'
      )

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
        throw new Error(errorData.message || 'Failed to create survey flow')
      }

      const result = await response.json()

      // Close modal and show success
      setIsFlowModalOpen(false)
      form.reset()
      setUploadedFiles([])
      setQuestions([
        {
          question: '',
          type: 'text',
          required: true,
          options: [],
          placeholder: ''
        }
      ])

      // Notify dashboard to refresh and show success
      try {
        window.dispatchEvent(new CustomEvent('survey-flow-created'))
      } catch {}
      showToast(
        `Survey flow "${data.title}" created successfully! Workflow ID: ${result.data.workflowId}`,
        'success',
        'Survey Created'
      )
    } catch (error) {
      console.error('Error creating survey flow:', error)
      showToast(
        `Error creating survey flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
        'Survey Creation Failed'
      )
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...context} />
      case 'data':
        return <SurveyDataTab {...context} />
      case 'templates':
        return <SurveyTemplatesTab {...context} />
      case 'analytics':
        return <AnalyticsTab {...context} />
      case 'audit':
        return <AuditTab {...context} />
      default:
        return null
    }
  }

  return (
    <div data-testid="survey-solution-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: ClipboardList,
          variant: 'default',
          size: 'lg',
          label: 'Survey'
        }}
        headerTitle="Survey"
        headerDescription="Create and manage surveys, collect feedback, and analyze responses"
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
              <Button variant="default" size="sm" data-testid="create-survey-button">
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Create Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="gba:max-w-3xl gba:max-h-[90vh] gba:overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Survey</DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-6">
                  {/* Title Field */}
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Survey title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter survey title..." {...field} data-testid="survey-flow-title-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Survey Type Field */}
                  <FormField
                    control={form.control}
                    name="surveyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="survey-flow-type-select">
                              <SelectValue placeholder="Select survey type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="feedback">Feedback Survey</SelectItem>
                              <SelectItem value="research">Research Survey</SelectItem>
                              <SelectItem value="assessment">Assessment</SelectItem>
                              <SelectItem value="poll">Quick Poll</SelectItem>
                              <SelectItem value="custom">Custom Survey</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Message Field */}
                  <FormField
                    control={form.control}
                    name="message"
                    rules={{ required: 'Description is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter survey description and instructions..."
                            rows={3}
                            {...field}
                            data-testid="survey-flow-message-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Questions Field */}
                  <FormItem>
                    <FormLabel>Survey Questions</FormLabel>
                    <div className="gba:space-y-4">
                      {questions.map((question, index) => (
                        <div key={index} className="gba:space-y-3 gba:p-4 gba:border gba:rounded gba:bg-gray-50">
                          {/* Question Text and Type */}
                          <div className="gba:flex gba:gap-2 gba:items-start">
                            <Input
                              placeholder={`Question ${index + 1}...`}
                              value={question.question}
                              onChange={e => updateQuestion(index, 'question', e.target.value)}
                              className="gba:flex-1"
                              data-testid={`survey-question-input-${index}`}
                            />
                            <Select value={question.type} onValueChange={value => updateQuestion(index, 'type', value)}>
                              <SelectTrigger className="gba:w-[140px]" data-testid={`survey-question-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="radio">Radio</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="rating">Rating</SelectItem>
                              </SelectContent>
                            </Select>
                            {questions.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeQuestion(index)}
                                data-testid={`survey-remove-question-${index}`}
                              >
                                Remove
                              </Button>
                            )}
                          </div>

                          {/* Question Settings */}
                          <div className="gba:flex gba:gap-4 gba:items-center gba:text-sm">
                            <label className="gba:flex gba:items-center gba:gap-2">
                              <input
                                type="checkbox"
                                checked={question.required}
                                onChange={e => updateQuestion(index, 'required', e.target.checked)}
                                data-testid={`survey-question-required-${index}`}
                              />
                              Required
                            </label>
                            {(question.type === 'text' || question.type === 'textarea') && (
                              <Input
                                placeholder="Placeholder text..."
                                value={question.placeholder || ''}
                                onChange={e => updateQuestion(index, 'placeholder', e.target.value)}
                                className="gba:w-48"
                                data-testid={`survey-question-placeholder-${index}`}
                              />
                            )}
                            {question.type === 'rating' && (
                              <div className="gba:flex gba:gap-2 gba:items-center">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  value={question.minRating || 1}
                                  onChange={e => updateQuestion(index, 'minRating', parseInt(e.target.value) || 1)}
                                  className="gba:w-16"
                                  min="1"
                                  max="10"
                                  data-testid={`survey-question-min-rating-${index}`}
                                />
                                <span>to</span>
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  value={question.maxRating || 5}
                                  onChange={e => updateQuestion(index, 'maxRating', parseInt(e.target.value) || 5)}
                                  className="gba:w-16"
                                  min="2"
                                  max="10"
                                  data-testid={`survey-question-max-rating-${index}`}
                                />
                              </div>
                            )}
                          </div>

                          {/* Options for multi-choice questions */}
                          {['select', 'radio', 'checkbox'].includes(question.type) && (
                            <div className="gba:space-y-2">
                              <div className="gba:flex gba:items-center gba:justify-between">
                                <span className="gba:text-sm gba:text-gray-600">Answer Options:</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addQuestionOption(index)}
                                  data-testid={`survey-add-option-${index}`}
                                >
                                  Add Option
                                </Button>
                              </div>

                              {(question.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="gba:flex gba:gap-2 gba:items-center gba:pl-4">
                                  <Input
                                    value={option}
                                    onChange={e => updateQuestionOption(index, optionIndex, e.target.value)}
                                    placeholder={`Option ${optionIndex + 1}`}
                                    className="gba:flex-1"
                                    data-testid={`survey-option-${index}-${optionIndex}`}
                                  />
                                  {(question.options?.length || 0) > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeQuestionOption(index, optionIndex)}
                                      data-testid={`survey-remove-option-${index}-${optionIndex}`}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ))}

                              {(!question.options || question.options.length === 0) && (
                                <div className="gba:text-sm gba:text-gray-500 gba:pl-4">
                                  No options added yet. Click "Add Option" to create choices.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addQuestion}
                        data-testid="survey-add-question-button"
                      >
                        <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </FormItem>

                  {/* Documents Field */}
                  <FormItem>
                    <FormLabel>Attachments (Optional)</FormLabel>
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          className="gba:hidden"
                          id="document-upload"
                          data-testid="survey-flow-documents-input"
                        />
                        <label
                          htmlFor="document-upload"
                          className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border gba:border-dashed gba:border-gray-300 gba:rounded-md gba:cursor-pointer hover:gba:border-gray-400"
                        >
                          <Upload className="gba:w-4 gba:h-4" />
                          Upload Attachments
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                data-testid={`survey-remove-file-${index}`}
                              >
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
                        <FormLabel>Survey Participants</FormLabel>
                        <FormControl>
                          <AssignmentSelector
                            value={field.value}
                            onChange={field.onChange}
                            assignmentMode={AssignmentMode.ASSIGN}
                            accessToken={context.accessToken}
                            userInfo={context.userInfo}
                            data-testid="survey-flow-assignments"
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
                    rules={{ required: 'Response deadline is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Deadline</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="Select response deadline..."
                            {...field}
                            data-testid="survey-flow-due-date-input"
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
                      onClick={() => setIsFlowModalOpen(false)}
                      data-testid="create-survey-cancel-button"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="default" data-testid="create-survey-submit-button">
                      Create & Launch Survey
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

export default SurveySolution
