import React, { useState } from 'react'
import {
  PageLayout,
  Spinner,
  Alert,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge
} from '@newwork/nw-design-system'
import { Plus, Edit, Eye, ArrowLeft, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineSettings } from './hooks/usePipelineSettings'
import { PipelineStagesModal } from './components'
import PipelineForm from './components/PipelineForm'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { usePipelineUsageCheck } from './hooks/usePipelineUsageCheck'

export interface EnhancedPipeline {
  id: string
  value: string
  description?: string
  type?: string
  stageCount: number
  conditionCount: number
  objectValue?: Record<string, any>
  isInUse?: boolean
  totalOpportunityCount?: number
}

export interface PipelineSettingsProps {
  className?: string
  prefixDataTestId?: string
  headerPhosphorIcon?: {
    icon: any
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'employee' | 'strategy' | 'premium'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    label?: string
  }
  headerTitle?: string
  headerDescription?: string
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onBack?: () => void
  catalogConfig: {
    pipelineCatalog: string
    stageCatalog: string
    conditionCatalog?: string
    version?: string
  }
}

const PipelineSettings: React.FC<PipelineSettingsProps & BusinessAppContextProps> = ({
  className,
  prefixDataTestId = 'pipeline-settings',
  headerPhosphorIcon,
  headerTitle = 'Pipeline Settings',
  headerDescription = 'Manage your pipeline configurations',
  isLoading,
  error,
  onRetry,
  onBack,
  catalogConfig,
  accessToken
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<EnhancedPipeline | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedPipeline | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pipelineToDelete, setPipelineToDelete] = useState<EnhancedPipeline | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [isCannotDeleteDialogOpen, setIsCannotDeleteDialogOpen] = useState(false)
  const [pipelineCannotDelete, setPipelineCannotDelete] = useState<EnhancedPipeline | null>(null)

  const { pipelines, refetch } = usePipelineSettings({ accessToken }, catalogConfig)
  const catalogClient = useCatalogManagerClient(accessToken)
  const { checkPipelineUsage } = usePipelineUsageCheck(accessToken, 'CRM')

  const handleCreatePipeline = () => {
    setEditingPipeline(null)
    setIsCreateModalOpen(true)
  }

  const handleEditPipeline = (pipeline: EnhancedPipeline) => {
    setEditingPipeline(pipeline)
    setIsEditModalOpen(true)
  }

  const handleViewStages = (pipeline: EnhancedPipeline) => {
    setSelectedPipeline(pipeline)
    setIsStagesModalOpen(true)
  }

  const handlePipelineSuccess = () => {
    refetch()
  }

  const handleDeletePipeline = async (pipeline: EnhancedPipeline) => {
    // Check usage before proceeding
    const usage = await checkPipelineUsage(pipeline.id)

    if (usage.isInUse) {
      // Pipeline is in use - show "cannot delete" dialog
      setPipelineCannotDelete({
        ...pipeline,
        isInUse: true,
        totalOpportunityCount: usage.totalCount
      })
      setIsCannotDeleteDialogOpen(true)
    } else {
      // Pipeline is NOT in use - show delete confirmation
      setPipelineToDelete(pipeline)
      setIsDeleteConfirmOpen(true)
    }
  }

  const confirmDeletePipeline = async () => {
    if (!pipelineToDelete) return

    try {
      setOperationLoading(true)

      // Step 1: Fetch all stages for this pipeline
      const stagesResponse = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogConfig.stageCatalog,
          version: catalogConfig.version || 'v1'
        },
        {
          limit: 1000,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const pipelineStages = stagesResponse.data.filter(entry => entry.parentEntryId === pipelineToDelete.id)

      // Step 2: For each stage, delete all its conditions
      if (catalogConfig.conditionCatalog && pipelineStages.length > 0) {
        const conditionsResponse = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: catalogConfig.conditionCatalog,
            version: catalogConfig.version || 'v1'
          },
          {
            limit: 1000,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Filter conditions that belong to any of these stages
        const stageIds = new Set(pipelineStages.map(stage => stage.id))
        const pipelineConditions = conditionsResponse.data.filter(entry => stageIds.has(entry.parentEntryId || ''))

        // Delete all conditions in parallel
        if (pipelineConditions.length > 0) {
          await Promise.all(
            pipelineConditions.map(condition =>
              catalogClient.deleteCatalogEntry(
                catalogConfig.conditionCatalog!,
                catalogConfig.version || 'v1',
                condition.id
              )
            )
          )
        }
      }

      // Step 3: Delete all stages
      if (pipelineStages.length > 0) {
        await Promise.all(
          pipelineStages.map(stage =>
            catalogClient.deleteCatalogEntry(catalogConfig.stageCatalog, catalogConfig.version || 'v1', stage.id)
          )
        )
      }

      // Step 4: Delete the pipeline itself
      await catalogClient.deleteCatalogEntry(
        catalogConfig.pipelineCatalog,
        catalogConfig.version || 'v1',
        pipelineToDelete.id
      )

      setIsDeleteConfirmOpen(false)
      setPipelineToDelete(null)
      await refetch()
    } catch (err) {
      console.error('Error deleting pipeline:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const renderPipelineCard = (pipeline: EnhancedPipeline) => (
    <Card
      key={pipeline.id}
      className="gba:relative gba:group gba:border-2 gba:border-gray-200 gba:hover:border-blue-400 gba:transition-all gba:duration-200"
      data-testid={`${prefixDataTestId}-pipeline-card-${pipeline.id}`}
    >
      {/* Action buttons in top right */}
      <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEditPipeline(pipeline)}
          data-testid={`${prefixDataTestId}-edit-pipeline-${pipeline.id}`}
        >
          <Edit />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeletePipeline(pipeline)}
          className="gba:text-destructive gba:hover:text-destructive"
          data-testid={`${prefixDataTestId}-delete-pipeline-${pipeline.id}`}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="gba:p-4 gba:pr-16">
        <div className="gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <h5 className="gba:text-gray-800 gba:font-medium gba:text-lg gba:leading-tight">{pipeline.value}</h5>
            {pipeline.isInUse && (
              <Badge variant="info" className="gba:text-xs">
                In Use
              </Badge>
            )}
          </div>
          {pipeline.description && (
            <p className="gba:text-gray-500 gba:text-sm gba:leading-tight">{pipeline.description}</p>
          )}
        </div>

        {/* Statistics */}
        <div className="gba:space-y-2 gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:rounded-lg gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
              <span className="gba:text-xs gba:text-gray-600">Stages</span>
            </div>
            <span
              className="gba:text-sm gba:font-semibold gba:text-blue-600"
              data-testid={`${prefixDataTestId}-pipeline-stage-count-${pipeline.id}`}
            >
              {pipeline.stageCount}
            </span>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:rounded-lg gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
              <span className="gba:text-xs gba:text-gray-600">Conditions</span>
            </div>
            <span
              className="gba:text-sm gba:font-semibold gba:text-orange-600"
              data-testid={`${prefixDataTestId}-pipeline-condition-count-${pipeline.id}`}
            >
              {pipeline.conditionCount}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="gba:mt-auto">
          <Button
            variant="outline"
            onClick={() => handleViewStages(pipeline)}
            className="gba:w-full"
            data-testid={`${prefixDataTestId}-view-stages-${pipeline.id}`}
          >
            <Eye className="gba:w-4 gba:h-4 gba:mr-2" />
            View Stages
          </Button>
        </div>
      </div>
    </Card>
  )

  if (isLoading) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
      >
        {onBack && (
          <div className="gba:py-2">
            <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              Back
            </Button>
          </div>
        )}
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
      >
        {onBack && (
          <div className="gba:py-2">
            <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              Back
            </Button>
          </div>
        )}
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <h4 className="gba:font-medium">Error Loading Pipelines</h4>
              <p className="gba:text-sm gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      className={className}
      headerPhosphorIcon={headerPhosphorIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
    >
      {onBack && (
        <div className="gba:py-2">
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back
          </Button>
        </div>
      )}
      <div className="gba:space-y-6">
        {/* Header */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">{headerTitle}</h2>
            <p className="gba:text-gray-600 gba:mt-1">{headerDescription}</p>
          </div>
          <Button onClick={handleCreatePipeline} data-testid={`${prefixDataTestId}-add-pipeline-button`}>
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Pipeline
          </Button>
        </div>

        {/* Pipelines Grid */}
        {pipelines.length === 0 ? (
          <div className="gba:min-h-64 gba:flex gba:items-center gba:justify-center gba:bg-gray-50 gba:rounded-lg gba:p-8">
            <div className="gba:text-center">
              <p className="gba:text-gray-500 gba:text-lg gba:mb-4">No pipelines configured yet</p>
              <p className="gba:text-gray-400 gba:text-sm gba:mb-6">Create your first pipeline to get started</p>
              <Button onClick={handleCreatePipeline} data-testid={`${prefixDataTestId}-create-first-pipeline-button`}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Create First Pipeline
              </Button>
            </div>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
            {pipelines.map(renderPipelineCard)}
          </div>
        )}
      </div>

      {/* Pipeline Form Modals */}
      <PipelineForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePipelineSuccess}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      <PipelineForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handlePipelineSuccess}
        editingPipeline={editingPipeline}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      {/* Pipeline Stages Modal */}
      {selectedPipeline && (
        <PipelineStagesModal
          isOpen={isStagesModalOpen}
          onClose={() => setIsStagesModalOpen(false)}
          pipeline={selectedPipeline}
          catalogConfig={catalogConfig}
          prefixDataTestId={prefixDataTestId}
          accessToken={accessToken}
          onStagesUpdated={refetch}
        />
      )}

      {/* Delete Confirmation Dialog - Only shown when NOT in use */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{pipelineToDelete?.value}"?</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:p-3 gba:bg-success-secondary gba:rounded-lg gba:border gba:border-success">
              <span className="gba:block gba:text-success-secondary-foreground gba:font-semibold">
                ✓ Pipeline is not currently in use
              </span>
              <span className="gba:block gba:mt-1 gba:text-success-secondary-foreground gba:text-sm">
                This pipeline can be safely deleted.
              </span>
            </div>
            <div>
              <span className="gba:block gba:text-warning gba:font-semibold gba:mb-2">
                This will permanently delete:
              </span>
              <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm">
                <li>The pipeline itself</li>
                <li>All {pipelineToDelete?.stageCount || 0} stages</li>
                <li>All {pipelineToDelete?.conditionCount || 0} stage conditions</li>
              </ul>
              <span className="gba:block gba:mt-2 gba:text-destructive gba:font-semibold">
                This action cannot be undone.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setPipelineToDelete(null)
              }}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-delete-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePipeline}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-delete-confirm-button`}
            >
              {operationLoading ? 'Deleting...' : 'Delete Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cannot Delete Dialog - Shown when pipeline is in use */}
      <Dialog open={isCannotDeleteDialogOpen} onOpenChange={setIsCannotDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete Pipeline</DialogTitle>
            <DialogDescription>
              The pipeline "{pipelineCannotDelete?.value}" cannot be deleted because it is currently in use.
            </DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:p-3 gba:bg-destructive-secondary gba:rounded-lg gba:border gba:border-destructive">
              <span className="gba:block gba:text-destructive-secondary-foreground gba:font-semibold gba:mb-2">
                ⚠️ Pipeline is Currently in Use
              </span>
              <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm gba:text-destructive-secondary-foreground">
                <li>{pipelineCannotDelete?.totalOpportunityCount || 0} opportunities are using this pipeline</li>
              </ul>
              <span className="gba:block gba:mt-2 gba:text-destructive-secondary-foreground gba:text-sm">
                To delete this pipeline, you must first move or delete all opportunities that reference it.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setIsCannotDeleteDialogOpen(false)
                setPipelineCannotDelete(null)
              }}
              data-testid={`${prefixDataTestId}-cannot-delete-confirm-button`}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

export default PipelineSettings
export { PipelineSettings }
