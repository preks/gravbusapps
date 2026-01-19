import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { StepItem } from './StepItem'
import { FlowPreview } from '../preview/FlowPreview'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface StepsSectionProps {
  accessToken?: string
  context?: BusinessAppContextProps
}

/**
 * Steps section component for managing workflow steps
 */
export const StepsSection: React.FC<StepsSectionProps> = ({ accessToken, context }) => {
  const { flowTemplate, addStep } = useFlowTemplateStore()
  const { steps } = flowTemplate

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid="steps-section">
      <div className="gba:flex gba:justify-between gba:items-center" data-testid="steps-section-header">
        <div className="gba:flex gba:items-center gba:gap-3">
          <h2 className="gba:text-xl gba:font-semibold" data-testid="steps-section-title">
            {getTranslationFromI18nKeyAndLabel('flow.creator.steps', 'Steps')}
          </h2>
        </div>

        <button
          onClick={addStep}
          className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:flex gba:items-center gba:gap-2"
          data-testid="add-step-button"
        >
          <span>+</span>
          {getTranslationFromI18nKeyAndLabel('flow.creator.addStep', 'Add Step')}
        </button>
      </div>

      {steps.length === 0 ? (
        <div
          className="gba:p-8 gba:text-center gba:text-gray-500 gba:border gba:border-dashed gba:border-gray-300 gba:rounded"
          data-testid="empty-steps-message"
        >
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.noSteps',
            'No steps added yet. Click "Add Step" to create your first workflow step.'
          )}
        </div>
      ) : (
        <div className="gba:grid gba:grid-cols-12 gba:gap-6" data-testid="steps-grid-layout">
          {/* Left side: Flow Preview */}
          <div className="gba:col-span-4" data-testid="steps-flow-preview">
            <FlowPreview />
          </div>

          {/* Right side: Step List and Configuration */}
          <div className="gba:col-span-8" data-testid="steps-list">
            <div className="gba:flex gba:flex-col gba:gap-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="gba:border gba:border-gray-200 gba:rounded gba:overflow-hidden"
                  data-testid={`step-container-${index}`}
                >
                  <StepItem
                    step={step}
                    stepIndex={index}
                    accessToken={accessToken}
                    context={context}
                    data-testid={`step-item-${index}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
