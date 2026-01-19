import React, { useState } from 'react'
import { Modal } from 'antd'
import {
  Button,
  Card,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Spinner,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Plus, Edit, Trash2, Eye, Settings } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineDataIntegration } from '../hooks/usePipelineDataIntegration'
import { useStageConditions } from '../hooks/useStageConditions'
import { useSalesPipelineStages } from '../hooks/useSalesPipelineStages'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getPipelineCatalogConfig } from '../utils/catalogConfig'
import { EnhancedSalesPipeline, PipelineFormData } from '../types'
import { PipelineStagesModal } from './PipelineStagesModal'
import { convertToScreamingSnakeCase } from '../utils'

// Pipeline Type Options
const PIPELINE_TYPE_OPTIONS = [
  { label: 'Customer Pipeline', value: 'CRM' },
  { label: 'Investment Pipeline', value: 'IRM' }
]

export interface PipelineOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  sourceApp?: 'CRM' | 'IRM' // Add sourceApp parameter for filtering
}

export const PipelineOverview: React.FC<PipelineOverviewProps> = props => {
  const { prefixDataTestId, sourceApp = 'CRM' } = props

  // Modal states
  const [isPipelineModalVisible, setIsPipelineModalVisible] = useState(false)
  const [isStagesModalVisible, setIsStagesModalVisible] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<EnhancedSalesPipeline | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedSalesPipeline | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pipelineToDelete, setPipelineToDelete] = useState<EnhancedSalesPipeline | null>(null)

  // Pipeline condition counts state
  const [pipelineConditionCounts, setPipelineConditionCounts] = useState<Record<string, number>>({})
  const [loadingPipelineConditions, setLoadingPipelineConditions] = useState<Record<string, boolean>>({})

  const pipelineForm = useForm<PipelineFormData>({
    defaultValues: {
      value: '',
      description: '',
      type: sourceApp // Default to current sourceApp
    }
  })

  const { pipelines, isLoading, error, refetch } = usePipelineDataIntegration(props, { sourceApp })
  const { fetchStageConditionsCount } = useStageConditions(props)
  const { fetchSalesPipelineStagesByParent } = useSalesPipelineStages(props)
  const catalogClient = useCatalogManagerClient(props.accessToken)

  // Load pipeline condition counts when pipelines change
  React.useEffect(() => {
    if (pipelines.length > 0) {
      loadPipelineConditionCounts()
    }
  }, [pipelines])

  const loadPipelineConditionCounts = async () => {
    const counts: Record<string, number> = {}
    const loading: Record<string, boolean> = {}

    // Set loading state for all pipelines
    pipelines.forEach(pipeline => {
      loading[pipeline.id] = true
    })
    setLoadingPipelineConditions(loading)

    // Fetch condition counts for each pipeline
    const promises = pipelines.map(async pipeline => {
      try {
        // First, get all stages for this pipeline
        const stagesResponse = await fetchSalesPipelineStagesByParent(pipeline.id, { sourceApp })
        const stages = stagesResponse.data.filter(entry => entry.parentEntryId === pipeline.id)

        // Then, get condition counts for each stage and sum them up
        const conditionPromises = stages.map(stage => fetchStageConditionsCount(stage.code, sourceApp))
        const stageCounts = await Promise.all(conditionPromises)

        // Sum all condition counts for this pipeline
        const totalCount = stageCounts.reduce((sum, count) => sum + count, 0)
        counts[pipeline.id] = totalCount
        loading[pipeline.id] = false
      } catch (error) {
        console.error(`Error loading conditions for pipeline ${pipeline.value}:`, error)
        counts[pipeline.id] = 0
        loading[pipeline.id] = false
      }
    })

    await Promise.all(promises)

    setPipelineConditionCounts(counts)
    setLoadingPipelineConditions(loading)
  }

  // Combined refresh function for pipelines and their condition counts
  const refreshPipelinesAndCounts = async () => {
    await refetch()
    // Note: condition counts will be automatically reloaded via useEffect when pipelines change
  }

  // Pipelines are already filtered by sourceApp in the hook

  const handleAddPipeline = () => {
    setEditingPipeline(null)
    pipelineForm.reset({
      value: '',
      description: '',
      type: sourceApp // Default to current sourceApp
    })
    setIsPipelineModalVisible(true)
  }

  const handleEditPipeline = (pipeline: EnhancedSalesPipeline) => {
    setEditingPipeline(pipeline)
    pipelineForm.reset({
      value: pipeline.value,
      description: pipeline.description,
      type: pipeline.type || sourceApp
    })
    setIsPipelineModalVisible(true)
  }

  const handleViewStages = (pipeline: EnhancedSalesPipeline) => {
    setSelectedPipeline(pipeline)
    setIsStagesModalVisible(true)
  }

  const handleDeletePipeline = (pipeline: EnhancedSalesPipeline) => {
    setPipelineToDelete(pipeline)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!pipelineToDelete) return

    try {
      setOperationLoading(true)
      const cfg = getPipelineCatalogConfig(sourceApp)
      await catalogClient.deleteCatalogEntry(cfg.pipelineCatalog, cfg.version, pipelineToDelete.id)
      console.log(`Pipeline "${pipelineToDelete.value}" deleted successfully`)
      await refreshPipelinesAndCounts()
    } catch (error) {
      console.error('Error deleting pipeline:', error)
    } finally {
      setOperationLoading(false)
      setDeleteDialogOpen(false)
      setPipelineToDelete(null)
    }
  }

  const handlePipelineModalSubmit = async (values: PipelineFormData) => {
    try {
      setOperationLoading(true)

      if (editingPipeline) {
        // Update existing pipeline
        const payload: any = {
          id: editingPipeline.id,
          code: editingPipeline.code,
          value: values.value,
          type: values.type,
          objectValue: editingPipeline.objectValue || {},
          translations: []
        }

        if (values.description) {
          payload.additionalValue1 = values.description
        }
        const cfg = getPipelineCatalogConfig(sourceApp)
        await catalogClient.updateCatalogEntry(cfg.pipelineCatalog, cfg.version, editingPipeline.id, payload)
        console.log(`Pipeline "${values.value}" updated successfully`)
      } else {
        // Create new pipeline
        const code = convertToScreamingSnakeCase(values.value)

        const payload: any = {
          code,
          value: values.value,
          type: values.type,
          objectValue: {},
          translations: []
        }

        if (values.description) {
          payload.additionalValue1 = values.description
        }

        const cfg = getPipelineCatalogConfig(sourceApp)
        await catalogClient.createCatalogEntry(cfg.pipelineCatalog, cfg.version, payload)
        console.log(`Pipeline "${values.value}" created successfully`)
      }

      setIsPipelineModalVisible(false)
      await refreshPipelinesAndCounts()
    } catch (error) {
      console.error('Error saving pipeline:', error)
    } finally {
      setOperationLoading(false)
    }
  }

  const getPipelineTypeColor = (type: string) => {
    switch (type) {
      case 'CRM':
        return 'default'
      case 'IRM':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getPipelineTypeLabel = (type: string) => {
    switch (type) {
      case 'CRM':
        return 'Customer'
      case 'IRM':
        return 'Investment'
      default:
        return type
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Spinner className="gba:w-8 gba:h-8" />
        <div className="gba:ml-4 gba:text-gray-600">
          Loading pipeline data...
          <br />
          <span className="gba:text-sm gba:text-gray-500">
            Fetching {sourceApp === 'CRM' ? 'sales' : 'investment'} pipelines from catalog
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error-alert`}>
        <AlertDescription>
          Error Loading Pipeline Data: {error}
          <Button variant="outline" size="sm" onClick={refreshPipelinesAndCounts} className="gba:ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-PipelineOverview`} className="gba:h-full gba:p-6">
      {/* Action Button */}
      <div className="gba:flex gba:justify-end gba:mb-6">
        <Button
          onClick={handleAddPipeline}
          data-testid={`${prefixDataTestId}-add-pipeline-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <Plus className="gba:w-4 gba:h-4" />
          Add Pipeline
        </Button>
      </div>

      {/* Pipeline Grid */}
      {pipelines.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:w-full gba:h-96 gba:bg-gray-50 gba:rounded-lg gba:border-2 gba:border-dashed gba:border-gray-300">
          <div className="gba:text-center">
            <Settings className="gba:w-16 gba:h-16 gba:text-gray-400 gba:mb-4 gba:mx-auto" />
            <h4 className="gba:text-xl gba:font-medium gba:text-gray-500 gba:mb-2">
              No {sourceApp === 'CRM' ? 'Sales' : 'Investment'} Pipelines Found
            </h4>
            <p className="gba:text-gray-400 gba:mb-4">
              Create your first {sourceApp === 'CRM' ? 'sales' : 'investment'} pipeline to get started
            </p>
            <Button onClick={handleAddPipeline} className="gba:flex gba:items-center gba:gap-2">
              <Plus className="gba:w-4 gba:h-4" />
              Create Pipeline
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:flex gba:flex-wrap gba:gap-6 gba:justify-start">
          {pipelines.map(pipeline => (
            <Card
              key={pipeline.id}
              className="gba:max-w-96 gba:flex-1 gba:min-w-80 gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-lg gba:transition-all gba:relative gba:border-t-4 gba:border-t-blue-500 gba:shadow-md gba:duration-200 gba:rounded-xl gba:overflow-hidden"
              data-testid={`${prefixDataTestId}-pipeline-card-${pipeline.id}`}
            >
              {/* Edit and Delete buttons in top right corner */}
              <div className="gba:absolute gba:top-4 gba:right-4 gba:flex gba:gap-1 gba:z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    handleEditPipeline(pipeline)
                  }}
                  className="gba:text-gray-400 hover:gba:text-blue-500 gba:p-1 gba:h-6 gba:w-6"
                  data-testid={`${prefixDataTestId}-edit-pipeline-${pipeline.id}`}
                >
                  <Edit className="gba:w-3 gba:h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    handleDeletePipeline(pipeline)
                  }}
                  className="gba:text-gray-400 hover:gba:text-red-500 gba:p-1 gba:h-6 gba:w-6"
                  data-testid={`${prefixDataTestId}-delete-pipeline-${pipeline.id}`}
                >
                  <Trash2 className="gba:w-3 gba:h-3" />
                </Button>
              </div>

              <div className="gba:p-4 gba:flex gba:flex-col gba:h-full">
                {/* Header Section */}
                <div className="gba:mb-3">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-2">
                    <h5 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:flex-1">{pipeline.value}</h5>
                  </div>

                  {/* Pipeline Type Badge */}
                  <div className="gba:mb-3">
                    <Badge
                      variant={getPipelineTypeColor(pipeline.type)}
                      className="gba:text-xs gba:font-medium gba:px-2 gba:py-1"
                    >
                      {getPipelineTypeLabel(pipeline.type)}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="gba:text-sm gba:min-h-[2.5rem] gba:leading-relaxed">
                    {pipeline.description ? (
                      <span className="gba:text-gray-600">{pipeline.description}</span>
                    ) : (
                      <span className="gba:text-gray-400 gba:italic">No description</span>
                    )}
                  </p>
                </div>

                {/* Pipeline Statistics - Middle Section */}
                <div className="gba:bg-gray-50 gba:rounded-lg gba:p-3 gba:border gba:border-gray-200 gba:flex-1">
                  <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full gba:flex-shrink-0"></div>
                      <span className="gba:text-sm gba:font-medium gba:text-gray-700">Stages:</span>
                    </div>
                    <span
                      className="gba:text-sm gba:font-semibold gba:text-blue-600"
                      data-testid={`${prefixDataTestId}-pipeline-stage-count-${pipeline.id}`}
                    >
                      {pipeline.stageCount}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full gba:flex-shrink-0"></div>
                      <span className="gba:text-sm gba:font-medium gba:text-gray-700">Conditions:</span>
                    </div>
                    <span
                      className="gba:text-sm gba:font-semibold gba:text-orange-600"
                      data-testid={`${prefixDataTestId}-pipeline-condition-count-${pipeline.id}`}
                    >
                      {loadingPipelineConditions[pipeline.id] ? (
                        <Spinner className="gba:w-3 gba:h-3" />
                      ) : (
                        pipelineConditionCounts[pipeline.id] || 0
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Button - Bottom Section */}
                <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-gray-200">
                  <Button
                    onClick={() => handleViewStages(pipeline)}
                    className="gba:w-full gba:flex gba:items-center gba:justify-center gba:gap-2"
                    size="sm"
                    data-testid={`${prefixDataTestId}-view-stages-${pipeline.id}`}
                  >
                    <Eye className="gba:w-4 gba:h-4" />
                    View Stages
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline Modal */}
      <Modal
        open={isPipelineModalVisible}
        onCancel={() => setIsPipelineModalVisible(false)}
        footer={null}
        width={600}
        centered
        title={editingPipeline ? 'Edit Pipeline' : 'Add New Pipeline'}
        data-testid={`${prefixDataTestId}-pipeline-modal`}
      >
        <div>
          <Form {...pipelineForm}>
            <form onSubmit={pipelineForm.handleSubmit(handlePipelineModalSubmit)} className="gba:space-y-4">
              <FormField
                control={pipelineForm.control}
                name="value"
                rules={{ required: 'Please enter a pipeline name' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Please Enter..."
                        data-testid={`${prefixDataTestId}-pipeline-name-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pipelineForm.control}
                name="type"
                rules={{ required: 'Please select a pipeline type' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid={`${prefixDataTestId}-pipeline-type-select`}>
                          <SelectValue placeholder="Select Pipeline Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PIPELINE_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pipelineForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the purpose and use case of this pipeline..."
                        rows={3}
                        data-testid={`${prefixDataTestId}-pipeline-description-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPipelineModalVisible(false)}
                  data-testid={`${prefixDataTestId}-pipeline-modal-cancel`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={operationLoading}
                  data-testid={`${prefixDataTestId}-pipeline-modal-submit`}
                >
                  {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
                  {editingPipeline ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={null}
        width={500}
        centered
        title="Delete Pipeline"
        data-testid={`${prefixDataTestId}-delete-confirmation-modal`}
      >
        <div className="gba:py-4">
          <p>
            Are you sure you want to delete pipeline "{pipelineToDelete?.value}"? This will also delete all its stages.
          </p>
        </div>

        <div className="gba:flex gba:gap-2 gba:pt-4">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            data-testid={`${prefixDataTestId}-delete-cancel-button`}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={operationLoading}
            data-testid={`${prefixDataTestId}-delete-confirm-button`}
          >
            {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
            Delete
          </Button>
        </div>
      </Modal>

      {/* Pipeline Stages Modal */}
      <PipelineStagesModal
        pipeline={selectedPipeline}
        visible={isStagesModalVisible}
        onClose={() => {
          setIsStagesModalVisible(false)
          setSelectedPipeline(null)
          refreshPipelinesAndCounts()
        }}
        prefixDataTestId={prefixDataTestId}
        {...props}
      />
    </div>
  )
}
