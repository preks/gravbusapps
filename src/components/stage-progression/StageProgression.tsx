import React from 'react'
import { TooltipProvider } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { cn } from '@/common/utils/cn'
import type { StageProgressionProps, Stage } from './types'

// Helper function to determine stage color classes
const getStageColorClasses = (isCurrentStage: boolean, isCompleted: boolean) => {
  if (isCompleted || isCurrentStage) {
    return 'gba:bg-success gba:text-primary-foreground'
  }
  return 'gba:bg-muted gba:text-muted-foreground'
}

// Helper function to determine border styling
const getBorderStyling = (index: number, totalStages: number) => {
  const styling = {
    borderRadius: '0',
    clipPath: 'none',
    WebkitClipPath: 'none',
    marginRight: '0'
  }

  if (index === 0) {
    styling.borderRadius = '20px 0 0 20px'
    if (totalStages > 1) {
      styling.clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
      styling.WebkitClipPath = styling.clipPath
      styling.marginRight = '8px'
    } else {
      styling.borderRadius = '20px'
    }
  } else if (index === totalStages - 1) {
    styling.borderRadius = '0 20px 20px 0'
    styling.clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
  } else {
    styling.clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
    styling.marginRight = '8px'
  }

  return styling
}

// Default stage content renderer
const DefaultStageContent: React.FC<{
  stage: Stage
  isCurrentStage: boolean
  isCompleted: boolean
  stagesCount: number
}> = ({ stage, isCurrentStage, isCompleted, stagesCount }) => (
  <>
    {(isCurrentStage || isCompleted) && (
      <span
        className={cn(
          'gba:text-sm gba:font-bold gba:rounded-full gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:text-primary-foreground',
          isCompleted ? 'gba:bg-primary-100' : 'gba:bg-success'
        )}
      >
        ✓
      </span>
    )}
    <span className={cn('gba:whitespace-nowrap', stagesCount > 4 ? 'gba:text-xs' : 'gba:text-sm')}>{stage.value}</span>
  </>
)

// Stage item component to reduce cognitive complexity
interface StageItemProps {
  stage: Stage
  index: number
  totalStages: number
  isCurrentStage: boolean
  isCompleted: boolean
  onStageClick?: (stage: Stage) => void
  renderStageContent?: (stage: Stage, isCurrentStage: boolean, isCompleted: boolean) => React.ReactNode
  children?: (stage: Stage, isCurrentStage: boolean, isCompleted: boolean, element: React.ReactNode) => React.ReactNode
  dataTestIdPrefix: string
}

const StageItem: React.FC<StageItemProps> = ({
  stage,
  index,
  totalStages,
  isCurrentStage,
  isCompleted,
  onStageClick,
  renderStageContent,
  children,
  dataTestIdPrefix
}) => {
  const colorClasses = getStageColorClasses(isCurrentStage, isCompleted)
  const { borderRadius, clipPath, WebkitClipPath, marginRight } = getBorderStyling(index, totalStages)
  const isInteractive = onStageClick && !isCurrentStage

  const handleClick = () => {
    if (isInteractive) {
      onStageClick(stage)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && isInteractive) {
      event.preventDefault()
      onStageClick(stage)
    }
  }

  const stageElement = (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Change stage to ${stage.value}` : stage.value}
      className={cn(
        'gba:relative gba:h-10 gba:flex-1 gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-semibold',
        colorClasses,
        isInteractive ? 'gba:cursor-pointer' : 'gba:cursor-default'
      )}
      style={{ borderRadius, marginRight, clipPath, WebkitClipPath }}
      data-testid={formatDataTestId(dataTestIdPrefix, `stage-${stage.code}`)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'gba:flex gba:items-center gba:gap-2 gba:px-4 gba:relative gba:z-10',
          index < totalStages - 1 && 'gba:pr-6',
          index > 0 && 'gba:pl-6'
        )}
      >
        {renderStageContent ? (
          renderStageContent(stage, isCurrentStage, isCompleted)
        ) : (
          <DefaultStageContent
            stage={stage}
            isCurrentStage={isCurrentStage}
            isCompleted={isCompleted}
            stagesCount={totalStages}
          />
        )}
      </div>
    </div>
  )

  return (
    <React.Fragment key={stage.id}>
      {children ? children(stage, isCurrentStage, isCompleted, stageElement) : stageElement}
    </React.Fragment>
  )
}

export const StageProgression: React.FC<StageProgressionProps> = ({
  stages,
  currentStage,
  onStageClick,
  renderStageContent,
  children,
  dataTestIdPrefix = 'stage-progression'
}) => {
  const getCurrentStageIndex = () => {
    const currentIndex = stages.findIndex(
      stage =>
        stage.value.toLowerCase() === currentStage.toLowerCase() ||
        stage.code.toLowerCase() === currentStage.toLowerCase()
    )
    return currentIndex >= 0 ? currentIndex : 0
  }

  const currentIndex = getCurrentStageIndex()

  if (stages.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="gba:flex gba:items-center gba:h-12 gba:bg-muted gba:rounded-3xl gba:overflow-visible gba:border gba:border-border gba:p-1 gba:gap-0">
        {stages.map((stage, index) => (
          <StageItem
            key={stage.id}
            stage={stage}
            index={index}
            totalStages={stages.length}
            isCurrentStage={index === currentIndex}
            isCompleted={index < currentIndex}
            onStageClick={onStageClick}
            renderStageContent={renderStageContent}
            children={children}
            dataTestIdPrefix={dataTestIdPrefix}
          />
        ))}
      </div>
    </TooltipProvider>
  )
}

export default StageProgression
