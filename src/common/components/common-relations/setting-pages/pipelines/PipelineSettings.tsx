import React, { useState } from 'react'
import { PageLayout, Spinner, Alert, Button, Card, Badge } from '@newwork/nw-design-system'
import { EyeIcon, FlowArrowIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePipelineSettings } from './hooks/usePipelineSettings'
import { PipelineStagesModal } from './components'
import PipelineForm from './components/PipelineForm'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { usePipelineUsageCheck } from './hooks/usePipelineUsageCheck'
import { getPipelineUsageCheckSource } from './utils/catalogConfig'
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog'
import type { DeleteAvailability } from '../types/catalogTypes'

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
    stageTypeCatalog?: string
    conditionCatalog?: string
    version?: string
  }
  hidePageLayout?: boolean
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
  accessToken,
  hidePageLayout = false
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<EnhancedPipeline | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedPipeline | null>(null)
  const [pipelineToDelete, setPipelineToDelete] = useState<EnhancedPipeline | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [deleteAvailability, setDeleteAvailability] = useState<DeleteAvailability | undefined>()
  const [isCheckingDeleteAvailability, setIsCheckingDeleteAvailability] = useState(false)

  const { pipelines, refetch } = usePipelineSettings({ accessToken }, catalogConfig)
  const catalogClient = useCatalogManagerClient(accessToken)
  const { checkPipelineUsage } = usePipelineUsageCheck(
    accessToken,
    getPipelineUsageCheckSource(catalogConfig.pipelineCatalog)
  )

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
    setPipelineToDelete(pipeline)
    setDeleteAvailability(undefined)
    setIsCheckingDeleteAvailability(true)

    const usage = await checkPipelineUsage(pipeline.id)

    if (usage.isInUse) {
      setDeleteAvailability({
        status: 'blocked',
        reason: usage.verificationFailed
          ? 'Unable to verify whether this pipeline can be deleted.'
          : 'Pipeline is currently in use.',
        usages: usage.verificationFailed
          ? undefined
          : [{ label: 'opportunities are using this pipeline', count: usage.totalCount }]
      })
    } else {
      setDeleteAvailability({ status: 'allowed' })
    }

    setIsCheckingDeleteAvailability(false)
  }

  const confirmDeletePipeline = async () => {
    if (!pipelineToDelete || deleteAvailability?.status === 'blocked') return

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

      await refetch()
      handleCancelDeletePipeline()
    } catch (err) {
      console.error('Error deleting pipeline:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleCancelDeletePipeline = () => {
    if (operationLoading) return
    setPipelineToDelete(null)
    setDeleteAvailability(undefined)
    setIsCheckingDeleteAvailability(false)
  }

  const renderPipelineCard = (pipeline: EnhancedPipeline) => (
    <Card
      key={pipeline.id}
      className="gba:relative gba:group gba:border gba:border-border gba:transition-all gba:duration-200 gba:hover:border-primary/40 gba:hover:shadow-sm"
      data-testid={`${prefixDataTestId}-pipeline-card-${pipeline.id}`}
    >
      {/* Action buttons in top right */}
      <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1 gba:z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEditPipeline(pipeline)}
          data-testid={`${prefixDataTestId}-edit-pipeline-${pipeline.id}`}
        >
          <PencilSimpleIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeletePipeline(pipeline)}
          className="gba:text-destructive hover:gba:text-destructive"
          data-testid={`${prefixDataTestId}-delete-pipeline-${pipeline.id}`}
        >
          <TrashIcon />
        </Button>
      </div>

      <div className="gba:p-4 gba:pr-16">
        <div className="gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <h5 className="gba:text-foreground gba:font-medium gba:text-lg gba:leading-tight">{pipeline.value}</h5>
            {pipeline.isInUse && (
              <Badge variant="info" className="gba:text-xs">
                In Use
              </Badge>
            )}
          </div>
          {pipeline.description && (
            <p className="gba:text-muted-foreground gba:text-sm gba:leading-tight">{pipeline.description}</p>
          )}
        </div>

        {/* Statistics */}
        <div className="gba:space-y-2 gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:bg-muted gba:rounded-lg gba:p-2">
            <span className="gba:text-xs gba:text-muted-foreground">Stages</span>
            <span
              className="gba:text-sm gba:font-semibold gba:text-foreground"
              data-testid={`${prefixDataTestId}-pipeline-stage-count-${pipeline.id}`}
            >
              {pipeline.stageCount}
            </span>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:bg-muted gba:rounded-lg gba:p-2">
            <span className="gba:text-xs gba:text-muted-foreground">Conditions</span>
            <span
              className="gba:text-sm gba:font-semibold gba:text-foreground"
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
            <EyeIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            View Stages
          </Button>
        </div>
      </div>
    </Card>
  )

  if (isLoading) {
    const loadingContent = (
      <div className="gba:flex gba:justify-center gba:py-8" data-testid={`${prefixDataTestId}-loading`}>
        <Spinner size="lg" />
      </div>
    )

    if (hidePageLayout) {
      return loadingContent
    }

    return (
      <PageLayout
        headerIcon={headerPhosphorIcon?.icon || FlowArrowIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        className={className}
      >
        {loadingContent}
      </PageLayout>
    )
  }

  if (error) {
    const errorContent = (
      <Alert variant="destructive" className="gba:mb-4" data-testid={`${prefixDataTestId}-error`}>
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
    )

    if (hidePageLayout) {
      return errorContent
    }

    return (
      <PageLayout
        headerIcon={headerPhosphorIcon?.icon || FlowArrowIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        className={className}
      >
        {errorContent}
      </PageLayout>
    )
  }

  const mainContent = (
    <>
      <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-container`}>
        {/* Add Pipeline Button */}
        <div className="gba:flex gba:justify-end">
          <Button onClick={handleCreatePipeline} data-testid={`${prefixDataTestId}-add-pipeline-button`}>
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Pipeline
          </Button>
        </div>

        {/* Pipelines Grid */}
        {pipelines.length === 0 ? (
          <div className="gba:min-h-64 gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:p-8">
            <div className="gba:text-center">
              <p className="gba:text-muted-foreground gba:text-lg gba:mb-4">No pipelines configured yet</p>
              <p className="gba:text-muted-foreground gba:text-sm gba:mb-6">
                Create your first pipeline to get started
              </p>
              <Button onClick={handleCreatePipeline} data-testid={`${prefixDataTestId}-create-first-pipeline-button`}>
                <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
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

      <DeleteConfirmationDialog
        open={!!pipelineToDelete}
        itemName={pipelineToDelete?.value || ''}
        itemType="Pipeline"
        availability={deleteAvailability}
        isChecking={isCheckingDeleteAvailability}
        isDeleting={operationLoading}
        blockedDescription={`The pipeline "${pipelineToDelete?.value || ''}" cannot be deleted because it is currently in use.`}
        confirmDetails={
          <div>
            <span className="gba:block gba:text-foreground gba:font-medium gba:mb-2">This will delete:</span>
            <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm">
              <li>The pipeline itself</li>
              <li>All {pipelineToDelete?.stageCount || 0} stages</li>
              <li>All {pipelineToDelete?.conditionCount || 0} stage conditions</li>
            </ul>
            <span className="gba:block gba:mt-2 gba:text-destructive gba:font-semibold">
              This action cannot be undone.
            </span>
          </div>
        }
        onCancel={handleCancelDeletePipeline}
        onConfirm={confirmDeletePipeline}
        dataTestId={`${prefixDataTestId}-delete-dialog`}
      />
    </>
  )

  if (hidePageLayout) {
    return mainContent
  }

  return (
    <PageLayout
      headerIcon={headerPhosphorIcon?.icon || FlowArrowIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      className={className}
    >
      {mainContent}
    </PageLayout>
  )
}

export default PipelineSettings
export { PipelineSettings }
