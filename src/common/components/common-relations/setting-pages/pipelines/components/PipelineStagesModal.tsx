import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import StagesForm from './StagesForm'
import ConditionsForm from './ConditionsForm'

interface PipelineStagesModalProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  pipeline: any
  catalogConfig: {
    pipelineCatalog?: string
    stageCatalog: string
    stageTypeCatalog?: string
    conditionCatalog?: string
    version?: string
  }
  prefixDataTestId?: string
  onStagesUpdated?: () => void
}

const PipelineStagesModal: React.FC<PipelineStagesModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  catalogConfig,
  prefixDataTestId = 'pipeline-stages-modal',
  accessToken,
  onStagesUpdated
}) => {
  const [, setStages] = useState<any[]>([])
  const [isConditionsModalOpen, setIsConditionsModalOpen] = useState(false)
  const [selectedStageForConditions, setSelectedStageForConditions] = useState<any>(null)
  const [stagesFormKey, setStagesFormKey] = useState(0)

  const handleStagesChange = (newStages: any[]) => {
    setStages(newStages)
  }

  const handleViewConditions = (stage: any) => {
    setSelectedStageForConditions(stage)
    setIsConditionsModalOpen(true)
  }

  const handleCloseConditionsModal = () => {
    setIsConditionsModalOpen(false)
    setSelectedStageForConditions(null)
  }

  const handleConditionsUpdated = () => {
    // Force StagesForm to re-fetch and update condition counts
    setStagesFormKey(prev => prev + 1)
    onStagesUpdated?.()
  }

  if (!pipeline) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="gba:[&&]:max-w-[95vw] gba:w-[95vw] gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pipeline Stages: {pipeline?.value}</DialogTitle>
            <DialogDescription>Manage stages for this pipeline. Drag and drop to reorder.</DialogDescription>
          </DialogHeader>

          <StagesForm
            key={stagesFormKey}
            pipeline={pipeline}
            catalogConfig={catalogConfig}
            onStagesChange={handleStagesChange}
            onViewConditions={handleViewConditions}
            onStagesUpdated={onStagesUpdated}
            prefixDataTestId={prefixDataTestId}
            accessToken={accessToken}
          />
        </DialogContent>
      </Dialog>

      {/* Conditions Modal */}
      <ConditionsForm
        isOpen={isConditionsModalOpen}
        onClose={handleCloseConditionsModal}
        selectedStage={selectedStageForConditions}
        catalogConfig={{
          conditionCatalog: catalogConfig.conditionCatalog || '',
          version: catalogConfig.version
        }}
        onConditionsUpdated={handleConditionsUpdated}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />
    </>
  )
}

export default PipelineStagesModal
